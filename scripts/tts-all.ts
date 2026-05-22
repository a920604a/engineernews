import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import matter from 'gray-matter';
import {
  synthesizeWithFallback,
  generateTTSScript,
  generateBilingualMap,
  getTTSDir,
  getTTSBasename,
  DEFAULT_TTS_API_URL,
} from '../src/lib/tts';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const TTS_API_URL = process.env.TTS_API_URL || DEFAULT_TTS_API_URL;
const isProd = process.argv.includes('--prod');
const targetFileArg = process.argv.find(a => a.startsWith('--file='))?.slice(7);

interface PostPair {
  enPath: string;
  zhPath: string;
  category: string;
  slug: string;
}

function getCategory(filePath: string): string {
  const rel = path.relative(POSTS_DIR, filePath);
  return rel.split(path.sep)[0];
}

function getPairs(): PostPair[] {
  const results: PostPair[] = [];
  const entries = fs.readdirSync(POSTS_DIR, { recursive: true }) as string[];
  for (const entry of entries) {
    if (!entry.endsWith('.en.md')) continue;
    const enPath = path.join(POSTS_DIR, entry);
    const zhPath = enPath.replace(/\.en\.md$/, '.md');
    if (!fs.existsSync(zhPath)) {
      console.warn(`  ⚠️  找不到中文配對: ${zhPath}`);
      continue;
    }
    const category = getCategory(enPath);
    const slug = getTTSBasename(path.basename(enPath, '.md'));
    results.push({ enPath, zhPath, category, slug });
  }
  return results;
}

function setAudioUrl(filePath: string, audioUrl: string): void {
  let raw = fs.readFileSync(filePath, 'utf-8');
  const line = `audio_url: "${audioUrl.replace(/"/g, '\\"')}"`;
  if (/^audio_url:/m.test(raw)) {
    raw = raw.replace(/^audio_url:.*$/m, line);
  } else {
    const closingIdx = raw.indexOf('\n---', 4);
    raw = raw.slice(0, closingIdx) + '\n' + line + raw.slice(closingIdx);
  }
  fs.writeFileSync(filePath, raw);
}

async function synthesizeIfNeeded(
  filePath: string,
  data: Record<string, unknown>,
  script: string,
  lang: 'en' | 'zh',
  audioSlug: string,
): Promise<void> {
  if (data.audio_url) {
    console.log(`  ⏭️  跳過音頻（已有 audio_url）: ${path.basename(filePath)}`);
    return;
  }
  const voice = lang === 'en' ? 'en-US-AvaNeural' : 'zh-TW-HsiaoChenNeural';
  console.log(`  🎙️  合成: ${data.title}`);
  try {
    const audioUrl = await synthesizeWithFallback(script, lang, audioSlug, {
      ttsApiUrl: TTS_API_URL,
      voice,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      isProd,
    });
    if (!audioUrl) {
      console.warn(`  ⚠️  跳過（audioUrl 為空）`);
      return;
    }
    setAudioUrl(filePath, audioUrl);
    if (isProd) {
      const escapedUrl = audioUrl.replace(/'/g, "''");
      const escapedSlug = audioSlug.replace(/'/g, "''");
      execSync(
        `wrangler d1 execute engineer-news-db --command "UPDATE posts SET audio_url='${escapedUrl}' WHERE slug='${escapedSlug}'" --remote`,
        { stdio: 'inherit' }
      );
    }
    console.log(`  ✅ ${audioUrl}`);
  } catch (e) {
    console.warn(`  ⚠️  失敗: ${e instanceof Error ? e.message : e}`);
  }
}

async function processPair(pair: PostPair): Promise<void> {
  const { enPath, zhPath, category, slug } = pair;

  const enRaw = fs.readFileSync(enPath, 'utf-8');
  const { data: enData } = matter(enRaw);
  if (enData.draft !== false) {
    console.log(`  ⏭️  跳過（草稿）: ${path.basename(enPath)}`);
    return;
  }

  const zhRaw = fs.readFileSync(zhPath, 'utf-8');
  const { data: zhData } = matter(zhRaw);

  const ttsDir = getTTSDir(category);
  fs.mkdirSync(ttsDir, { recursive: true });

  const enScriptPath = path.join(ttsDir, `${slug}.en.tts-script.txt`);
  const zhScriptPath = path.join(ttsDir, `${slug}.tts-script.txt`);
  const mapPath = path.join(ttsDir, `${slug}.bilingual-map.json`);

  const enContent = enRaw.replace(/^---[\s\S]*?---\n*/, '');
  const zhContent = zhRaw.replace(/^---[\s\S]*?---\n*/, '');

  console.log(`\n📄 配對: ${slug}`);
  const enScript = generateTTSScript(
    String(enData.title ?? ''),
    String(enData.tldr ?? ''),
    enContent,
    'en',
    enScriptPath
  );
  const zhScript = generateTTSScript(
    String(zhData.title ?? enData.title ?? ''),
    String(zhData.tldr ?? ''),
    zhContent,
    'zh',
    zhScriptPath
  );

  await generateBilingualMap(enScript, zhScript, mapPath);
  await synthesizeIfNeeded(enPath, enData, enScript, 'en', `${slug}.en`);
  await synthesizeIfNeeded(zhPath, zhData, zhScript, 'zh', slug);
}

async function main() {
  if (targetFileArg) {
    const filePath = path.isAbsolute(targetFileArg)
      ? targetFileArg
      : path.join(process.cwd(), targetFileArg);
    const enPath = filePath.endsWith('.en.md')
      ? filePath
      : filePath.replace(/\.md$/, '.en.md');
    const zhPath = enPath.replace(/\.en\.md$/, '.md');
    if (!fs.existsSync(enPath) || !fs.existsSync(zhPath)) {
      console.error('找不到配對文章（需要 .en.md 和對應的 .md 同時存在）');
      process.exit(1);
    }
    const category = getCategory(enPath);
    const slug = getTTSBasename(path.basename(enPath, '.md'));
    await processPair({ enPath, zhPath, category, slug });
  } else {
    const pairs = getPairs();
    console.log(`🔍 找到 ${pairs.length} 個配對`);
    // 純中文文章（無對應 .en.md）不在此批次範圍，需另行處理音頻合成
    for (const pair of pairs) {
      await processPair(pair);
    }
  }
  console.log('✅ 完成');
}

main().catch(console.error);
