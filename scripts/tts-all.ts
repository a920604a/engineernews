import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import matter from 'gray-matter';
import { synthesize, downloadFile, uploadToR2, getR2PublicUrl, processTextForTTS, DEFAULT_TTS_API_URL } from '../src/lib/tts';

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

  if (data.audio_url) {
    console.log(`  ⏭️  跳過（已有 audio_url）: ${path.basename(filePath)}`);
    return;
  }

  const title = data.title ?? path.basename(filePath, '.md');
  const tldr = data.tldr ?? '';
  const content = raw.replace(/^---[\s\S]*?---\n*/, '');
  const voice = data.lang === 'en' ? 'en-US-AvaNeural' : 'zh-TW-HsiaoChenNeural';

  console.log(`  🎙️  合成: ${title}`);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-all-'));
  try {
    const ttsText = processTextForTTS(title, tldr, content);
    const result = await synthesize({ text: ttsText, voice }, TTS_API_URL);

    const apiBase = TTS_API_URL.replace(/\/$/, '');
    const audioFilename = path.basename(result.audio_url);

    await downloadFile(`${apiBase}${result.audio_url}`, path.join(tmpDir, audioFilename));
    uploadToR2(path.join(tmpDir, audioFilename), `tts/${audioFilename}`, isProd);

    const audioUrl = getR2PublicUrl(`tts/${audioFilename}`);
    setAudioUrl(filePath, audioUrl);

    if (isProd) {
      const slug = path.basename(filePath, '.md');
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
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
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
