import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const CONTENT_DIR = path.join(process.cwd(), 'src/content/posts');
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function summarize(conversation: string): Promise<{ title: string; tldr: string; tags: string[]; category: string }> {
  if (!ACCOUNT_ID || !API_TOKEN) {
    console.error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN');
    process.exit(1);
  }

  const prompt = `你是一個技術文件撰寫助手。以下是一段工程對話紀錄，請分析並輸出 JSON：

<conversation>
${conversation}
</conversation>

請輸出以下格式的 JSON（只輸出 JSON，不要其他文字）：
{
  "title": "簡短的文章標題（20字以內）",
  "tldr": "一句話摘要（50字以內）",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "tech | debug | guide | product"
}`;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    }
  );

  const json = await response.json() as any;
  const text: string = json.result?.response ?? '';

  try {
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match?.[0] ?? '{}');
  } catch {
    return { title: 'Untitled', tldr: '', tags: [], category: 'tech' };
  }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

async function ingest() {
  const inputFile = process.argv[2];

  if (!inputFile) {
    console.log('Usage: pnpm ingest <conversation.txt>');
    console.log('  conversation.txt: 貼上對話紀錄的純文字檔案');
    process.exit(0);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  const conversation = fs.readFileSync(inputFile, 'utf-8');
  console.log(`\n讀取對話紀錄... (${conversation.length} 字元)`);

  console.log('正在用 Workers AI 分析對話...');
  const meta = await summarize(conversation);

  console.log('\n分析結果：');
  console.log(`  標題：${meta.title}`);
  console.log(`  摘要：${meta.tldr}`);
  console.log(`  標籤：${meta.tags.join(', ')}`);
  console.log(`  分類：${meta.category}`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  const confirmTitle = await ask(`\n標題 (Enter 確認，或輸入新標題): `);
  const finalTitle = confirmTitle.trim() || meta.title;
  rl.close();

  const today = new Date().toISOString().split('T')[0];
  const slug = `${today}-${slugify(finalTitle)}`;
  const outputPath = path.join(CONTENT_DIR, `${slug}.md`);

  const frontmatter = [
    '---',
    `title: "${finalTitle}"`,
    `date: "${today}"`,
    `category: "${meta.category}"`,
    `tags: [${meta.tags.map(t => `"${t}"`).join(', ')}]`,
    `lang: "zh-TW"`,
    `tldr: "${meta.tldr}"`,
    `draft: false`,
    '---',
    '',
    conversation,
  ].join('\n');

  fs.writeFileSync(outputPath, frontmatter);
  console.log(`\n✅ 文章已生成：${outputPath}`);
  console.log('   執行 git add . && git push 即可發布。');
}

ingest();
