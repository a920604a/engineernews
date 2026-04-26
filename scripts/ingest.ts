import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execSync } from 'node:child_process';
import { processTextForTTS, synthesize, DEFAULT_TTS_API_URL } from '../src/lib/tts';

const CONTENT_DIR = path.join(process.cwd(), 'src/content/posts');
const YES_MODE = process.argv.includes('--yes');
const DB_NAME = 'engineer-news-db';

function querySql<T = any>(sql: string): T[] {
  const tmp = path.join(process.cwd(), `.tmp_query_${Date.now()}.sql`);
  fs.writeFileSync(tmp, sql);
  try {
    const out = execSync(
      `wrangler d1 execute ${DB_NAME} --local --file=${tmp} --yes --json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'inherit'] }
    );
    const parsed = JSON.parse(out);
    return parsed?.[0]?.results ?? [];
  } catch {
    return [];
  } finally {
    fs.unlinkSync(tmp);
  }
}

function getSetting(key: string, defaultValue: string): string {
  try {
    const rows = querySql<{ value: string }>(`SELECT value FROM settings WHERE key='${key}'`);
    return rows[0]?.value ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/\b(sk-[a-zA-Z0-9]{20,})\b/g, '[REDACTED_API_KEY]'],
  [/\b(Bearer\s+[a-zA-Z0-9\-._~+/]+=*)\b/gi, 'Bearer [REDACTED]'],
  [/\b([a-f0-9]{32,64})\b/g, '[REDACTED_TOKEN]'],
  [/(password|passwd|secret|token|api[_-]?key)\s*[:=]\s*\S+/gi, '$1=[REDACTED]'],
  [/https?:\/\/[^@\s]+:[^@\s]+@/g, 'https://[REDACTED]@'],
];

function redactSecrets(text: string): string {
  let result = text;
  for (const [pattern, replacement] of SECRET_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function summarize(conversation: string): Promise<{ title: string; tldr: string; tags: string[]; category: string; lang: 'zh-TW' | 'en' }> {
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
  "category": "tech | debug | guide | product",
  "lang": "zh-TW | en"
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
    return { title: 'Untitled', tldr: '', tags: [], category: 'tech', lang: 'zh-TW' };
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
  const inputFile = process.argv.find(a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]);

  if (!inputFile) {
    console.log('Usage: pnpm ingest <conversation.txt> [--yes]');
    console.log('  --yes: 跳過互動，自動 commit + push');
    process.exit(0);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputFile, 'utf-8');
  const conversation = redactSecrets(raw);
  const redacted = raw.length - conversation.replace(/\[REDACTED[^\]]*\]/g, '').length;
  console.log(`\n讀取對話紀錄... (${conversation.length} 字元)${redacted > 0 ? ` ⚠️  已脫敏 ${redacted} 字元` : ''}`);

  console.log('正在用 Workers AI 分析對話...');
  const meta = await summarize(conversation);

  console.log('\n分析結果：');
  console.log(`  標題：${meta.title || 'Untitled'}`);
  console.log(`  摘要：${meta.tldr || ''}`);
  console.log(`  標籤：${(meta.tags || []).join(', ')}`);
  console.log(`  分類：${meta.category || 'tech'}`);

  let finalTitle = meta.title || 'Untitled';

  if (!YES_MODE) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));
    const confirmTitle = await ask(`\n標題 (Enter 確認，或輸入新標題): `);
    finalTitle = confirmTitle.trim() || meta.title;
    rl.close();
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const nowIso = now.toISOString();
  const slug = `${today}-${slugify(finalTitle)}`;
  const outputPath = path.join(CONTENT_DIR, `${slug}.md`);

  const lang = meta.lang || 'zh-TW';
  console.log(`\n正在嘗試預合成 TTS 音訊 (${lang})...`);
  let audioUrl = '';
  let srtUrl = '';
  try {
    const voiceSettingKey = lang === 'en' ? 'tts_voice_en' : 'tts_voice_zh';
    const defaultVoice = lang === 'en' ? 'en-US-AvaNeural' : 'zh-TW-HsiaoChenNeural';
    const voice = getSetting(voiceSettingKey, defaultVoice);
    
    const ttsText = processTextForTTS(finalTitle, meta.tldr || '', conversation);
    const ttsResult = await synthesize({
      text: ttsText,
      voice: voice
    }, process.env.TTS_API_URL || DEFAULT_TTS_API_URL);
    audioUrl = ttsResult.audio_url;
    srtUrl = ttsResult.srt_url;
    console.log(`✅ TTS 預合成成功 (${voice}): ${audioUrl}`);
  } catch (e) {
    console.warn(`⚠️ TTS 預合成跳過: ${e instanceof Error ? e.message : 'API 未啟動'}`);
  }

  const frontmatter = [
    '---',
    `title: "${finalTitle}"`,
    `date: "${nowIso}"`,
    `category: "${meta.category || 'tech'}"`,
    `tags: [${(meta.tags || []).map(t => `"${t}"`).join(', ')}]`,
    `lang: "${lang}"`,
    `tldr: "${meta.tldr || ''}"`,
    audioUrl ? `audio_url: "${audioUrl}"` : '',
    srtUrl ? `srt_url: "${srtUrl}"` : '',
    `draft: false`,
    '---',
    '',
    conversation,
  ].filter(Boolean).join('\n');

  fs.writeFileSync(outputPath, frontmatter);
  console.log(`\n✅ 文章已生成：${outputPath}`);

  if (YES_MODE) {
    console.log('自動 commit + push...');
    try {
      execSync(`git add "${outputPath}"`, { stdio: 'inherit' });
      execSync(`git commit -m "post: add ${slug}"`, { stdio: 'inherit' });
      execSync('git push', { stdio: 'inherit' });
      console.log('✅ 已 push，CI 將自動部署並同步 D1。');
    } catch (e) {
      console.error('❌ git push 失敗，文章已生成，請手動 push。');
      process.exit(1);
    }
  } else {
    console.log('   執行 git add . && git push 即可發布。');
  }
}

ingest();
