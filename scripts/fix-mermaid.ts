import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'node:fs/promises';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

function validateMermaid(code: string): { ok: boolean; error?: string } {
  const stack: string[] = [];
  const pairs: Record<string, string> = { '{': '}', '[': ']', '(': ')' };
  for (const char of code) {
    if (pairs[char]) stack.push(pairs[char]);
    else if (Object.values(pairs).includes(char)) {
      if (stack.pop() !== char) return { ok: false, error: '括號未對齊' };
    }
  }
  if (stack.length > 0) return { ok: false, error: '括號未閉合' };

  const validTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie'];
  const firstLine = code.trim().split('\n')[0].toLowerCase();
  if (!validTypes.some(t => firstLine.includes(t))) {
    return { ok: false, error: '無效的圖表類型' };
  }
  return { ok: true };
}

async function tryFixMermaid(badCode: string, reason: string): Promise<string> {
  if (!ACCOUNT_ID || !API_TOKEN) throw new Error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN');
  const prompt = `你是一個 Mermaid 語法專家。以下這段代碼有語法錯誤（原因：${reason}），請修正它。
只輸出修正後的代碼，不要有任何解釋文字，也不要包含 \`\`\`mermaid 標籤。

錯誤代碼：
${badCode}`;

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-70b-instruct`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    }
  );
  const json = await res.json() as any;
  return (json.result?.response ?? badCode).replace(/```mermaid/g, '').replace(/```/g, '').trim();
}

async function processFile(filePath: string): Promise<boolean> {
  let content = fs.readFileSync(filePath, 'utf-8');
  const mermaidRegex = /```mermaid([\s\S]*?)```/g;
  let changed = false;
  let match;

  while ((match = mermaidRegex.exec(content)) !== null) {
    const originalCode = match[1].trim();
    const validation = validateMermaid(originalCode);
    if (!validation.ok) {
      console.log(`  ❌ ${path.basename(filePath)}: ${validation.error}`);
      const fixed = await tryFixMermaid(originalCode, validation.error!);
      content = content.replace(match[1], `\n${fixed}\n`);
      changed = true;
      console.log(`  ✅ 已修復`);
    }
  }

  if (changed) fs.writeFileSync(filePath, content);
  return changed;
}

async function main() {
  const files: string[] = [];
  for await (const f of fs.readdirSync(POSTS_DIR, { recursive: true }) as Iterable<string>) {
    if (f.endsWith('.md')) files.push(path.join(POSTS_DIR, f));
  }

  console.log(`🔍 掃描 ${files.length} 篇文章...`);
  let fixed = 0;
  for (const f of files) {
    if (await processFile(f)) fixed++;
  }
  console.log(`✅ 完成，修復 ${fixed} 篇文章`);
}

main().catch(console.error);
