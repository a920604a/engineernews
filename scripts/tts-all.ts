import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import matter from 'gray-matter';
import { synthesizeWithFallback, generateTTSScript, DEFAULT_TTS_API_URL } from '../src/lib/tts';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const TTS_API_URL = process.env.TTS_API_URL || DEFAULT_TTS_API_URL;
const isProd = process.argv.includes('--prod');
const targetFileArg = process.argv.find(a => a.startsWith('--file='))?.slice(7);

function getAllPosts(): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(POSTS_DIR, { recursive: true }) as Iterable<string>) {
    if (entry.endsWith('.md')) results.push(path.join(POSTS_DIR, entry));
  }
  return results;
}

function setAudioUrl(filePath: string, audioUrl: string): void {
  let raw = fs.readFileSync(filePath, 'utf-8');
  const line = `audio_url: "${audioUrl.replace(/"/g, '\\"')}"`;
  if (/^audio_url:/m.test(raw)) {
    raw = raw.replace(/^audio_url:.*$/m, line);
  } else {
    // insert before the closing --- of frontmatter
    const closingIdx = raw.indexOf('\n---', 4);
    raw = raw.slice(0, closingIdx) + '\n' + line + raw.slice(closingIdx);
  }
  fs.writeFileSync(filePath, raw);
}

async function processPost(filePath: string): Promise<void> {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data } = matter(raw);

  if (data.draft !== false) {
    console.log(`  ⏭️  跳過（草稿）: ${path.basename(filePath)}`);
    return;
  }

  const title = data.title ?? path.basename(filePath, '.md');
  const tldr = data.tldr ?? '';
  const content = raw.replace(/^---[\s\S]*?---\n*/, '');
  const lang = data.lang === 'en' ? 'en' : 'zh';
  const voice = lang === 'en' ? 'en-US-AvaNeural' : 'zh-TW-HsiaoChenNeural';
  const slug = path.basename(filePath, '.md');

  const scriptPath = filePath.replace(/\.md$/, '.tts-script.txt');
  const ttsText = generateTTSScript(title, tldr, content, lang, scriptPath);

  if (data.audio_url) {
    console.log(`  ⏭️  跳過音頻（已有 audio_url）: ${path.basename(filePath)}`);
    return;
  }

  console.log(`  🎙️  合成: ${title}`);
  try {
    const audioUrl = await synthesizeWithFallback(ttsText, lang, slug, {
      ttsApiUrl: TTS_API_URL,
      voice,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      isProd,
    });
    if (!audioUrl) {
      console.warn(`  ⚠️  跳過（audioUrl 為空）: ${path.basename(filePath)}`);
      return;
    }

    setAudioUrl(filePath, audioUrl);

    if (isProd) {
      const escaped = audioUrl.replace(/'/g, "''");
      console.log(`  📝 寫入 D1: ${slug}`);
      execSync(
        `wrangler d1 execute engineer-news-db --command "UPDATE posts SET audio_url='${escaped}' WHERE slug='${slug}'" --remote`,
        { stdio: 'inherit' }
      );
    }

    console.log(`  ✅ ${audioUrl}`);
  } catch (e) {
    console.warn(`  ⚠️  失敗: ${e instanceof Error ? e.message : e}`);
  }
}

async function main() {
  const posts = targetFileArg
    ? [path.isAbsolute(targetFileArg) ? targetFileArg : path.join(process.cwd(), targetFileArg)]
    : getAllPosts();
  console.log(`🔍 找到 ${posts.length} 篇文章`);
  for (const p of posts) {
    await processPost(p);
  }
  console.log('✅ 完成');
}

main().catch(console.error);
