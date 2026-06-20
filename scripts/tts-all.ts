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

interface StageStats {
  generated: number;
  cached: number;
  skipped: number;
  failed: number;
}

function newStats(): StageStats {
  return { generated: 0, cached: 0, skipped: 0, failed: 0 };
}

function progress(current: number, total: number, label: string): void {
  const width = 30;
  const pct = total === 0 ? 1 : current / total;
  const filled = Math.round(width * pct);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  const pctStr = `${Math.round(pct * 100)}%`.padStart(4);
  const slug = label.length > 40 ? label.slice(0, 37) + '…' : label.padEnd(40);
  process.stdout.write(`\r  [${bar}] ${pctStr}  ${current}/${total}  ${slug}`);
}

function progressDone(): void {
  process.stdout.write('\n');
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

// ── Stage 1: 逐字稿 ──────────────────────────────────────────────────────────

async function stageScripts(pairs: PostPair[]): Promise<{ en: StageStats; zh: StageStats }> {
  console.log('\n══════════════════════════════════════');
  console.log('階段一：逐字稿生成');
  console.log('══════════════════════════════════════');

  const en = newStats();
  const zh = newStats();

  for (let i = 0; i < pairs.length; i++) {
    const { enPath, zhPath, category, slug } = pairs[i];
    progress(i + 1, pairs.length, slug);

    const enRaw = fs.readFileSync(enPath, 'utf-8');
    const { data: enData } = matter(enRaw);
    if (enData.draft !== false) {
      en.skipped++;
      zh.skipped++;
      continue;
    }

    const zhRaw = fs.readFileSync(zhPath, 'utf-8');
    const { data: zhData } = matter(zhRaw);

    const ttsDir = getTTSDir(category);
    fs.mkdirSync(ttsDir, { recursive: true });

    const enScriptPath = path.join(ttsDir, `${slug}.en.tts-script.txt`);
    const zhScriptPath = path.join(ttsDir, `${slug}.tts-script.txt`);
    const enContent = enRaw.replace(/^---[\s\S]*?---\n*/, '');
    const zhContent = zhRaw.replace(/^---[\s\S]*?---\n*/, '');

    const enCached = fs.existsSync(enScriptPath);
    try {
      generateTTSScript(String(enData.title ?? ''), String(enData.tldr ?? ''), enContent, 'en', enScriptPath);
      enCached ? en.cached++ : en.generated++;
    } catch (e) {
      process.stdout.write('\n');
      console.warn(`  ⚠️  EN 逐字稿失敗 [${slug}]: ${e instanceof Error ? e.message : e}`);
      en.failed++;
    }

    const zhCached = fs.existsSync(zhScriptPath);
    try {
      generateTTSScript(String(zhData.title ?? enData.title ?? ''), String(zhData.tldr ?? ''), zhContent, 'zh', zhScriptPath);
      zhCached ? zh.cached++ : zh.generated++;
    } catch (e) {
      process.stdout.write('\n');
      console.warn(`  ⚠️  ZH 逐字稿失敗 [${slug}]: ${e instanceof Error ? e.message : e}`);
      zh.failed++;
    }
  }
  progressDone();

  return { en, zh };
}

// ── Stage 2: 對齊映射 ─────────────────────────────────────────────────────────

async function stageMaps(pairs: PostPair[]): Promise<StageStats> {
  console.log('\n══════════════════════════════════════');
  console.log('階段二：雙語對齊映射');
  console.log('══════════════════════════════════════');

  const stats = newStats();

  for (let i = 0; i < pairs.length; i++) {
    const { enPath, category, slug } = pairs[i];
    progress(i + 1, pairs.length, slug);

    const { data: enData } = matter(fs.readFileSync(enPath, 'utf-8'));
    if (enData.draft !== false) { stats.skipped++; continue; }

    const ttsDir = getTTSDir(category);
    const enScriptPath = path.join(ttsDir, `${slug}.en.tts-script.txt`);
    const zhScriptPath = path.join(ttsDir, `${slug}.tts-script.txt`);
    const mapPath = path.join(ttsDir, `${slug}.bilingual-map.json`);

    if (!fs.existsSync(enScriptPath) || !fs.existsSync(zhScriptPath)) {
      process.stdout.write('\n');
      console.warn(`  ⚠️  跳過（逐字稿不存在）: ${slug}`);
      stats.skipped++;
      continue;
    }

    const cached = fs.existsSync(mapPath);
    try {
      const enScript = fs.readFileSync(enScriptPath, 'utf-8');
      const zhScript = fs.readFileSync(zhScriptPath, 'utf-8');
      await generateBilingualMap(enScript, zhScript, mapPath);
      cached ? stats.cached++ : stats.generated++;
    } catch (e) {
      process.stdout.write('\n');
      console.warn(`  ⚠️  對齊映射失敗 [${slug}]: ${e instanceof Error ? e.message : e}`);
      stats.failed++;
    }
  }
  progressDone();

  return stats;
}

// ── Stage 3: 音頻合成 ─────────────────────────────────────────────────────────

async function stageAudio(pairs: PostPair[]): Promise<{ en: StageStats; zh: StageStats }> {
  console.log('\n══════════════════════════════════════');
  console.log('階段三：音頻合成與上傳');
  console.log('══════════════════════════════════════');

  const en = newStats();
  const zh = newStats();

  for (let i = 0; i < pairs.length; i++) {
    const { enPath, zhPath, category, slug } = pairs[i];
    progress(i + 1, pairs.length, slug);

    const enRaw = fs.readFileSync(enPath, 'utf-8');
    const { data: enData } = matter(enRaw);
    if (enData.draft !== false) { en.skipped++; zh.skipped++; continue; }

    const zhRaw = fs.readFileSync(zhPath, 'utf-8');
    const { data: zhData } = matter(zhRaw);

    const ttsDir = getTTSDir(category);
    const enScriptPath = path.join(ttsDir, `${slug}.en.tts-script.txt`);
    const zhScriptPath = path.join(ttsDir, `${slug}.tts-script.txt`);

    if (!fs.existsSync(enScriptPath) || !fs.existsSync(zhScriptPath)) {
      process.stdout.write('\n');
      console.warn(`  ⚠️  跳過（逐字稿不存在）: ${slug}`);
      en.skipped++;
      zh.skipped++;
      continue;
    }

    const enScript = fs.readFileSync(enScriptPath, 'utf-8');
    const zhScript = fs.readFileSync(zhScriptPath, 'utf-8');

    if (enData.audio_url) {
      en.skipped++;
    } else {
      try {
        const audioUrl = await synthesizeWithFallback(enScript, 'en', `${slug}.en`, {
          ttsApiUrl: TTS_API_URL,
          voice: 'en-US-AvaNeural',
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
          apiToken: process.env.CLOUDFLARE_API_TOKEN,
          isProd,
        });
        if (audioUrl) {
          setAudioUrl(enPath, audioUrl);
          if (isProd) syncD1(audioUrl, `${slug}.en`);
          en.generated++;
        }
      } catch (e) {
        process.stdout.write('\n');
        console.warn(`  ⚠️  EN 合成失敗 [${slug}]: ${e instanceof Error ? e.message : e}`);
        en.failed++;
      }
    }

    if (zhData.audio_url) {
      zh.skipped++;
    } else {
      try {
        const audioUrl = await synthesizeWithFallback(zhScript, 'zh', slug, {
          ttsApiUrl: TTS_API_URL,
          voice: 'zh-TW-HsiaoChenNeural',
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
          apiToken: process.env.CLOUDFLARE_API_TOKEN,
          isProd,
        });
        if (audioUrl) {
          setAudioUrl(zhPath, audioUrl);
          if (isProd) syncD1(audioUrl, slug);
          zh.generated++;
        }
      } catch (e) {
        process.stdout.write('\n');
        console.warn(`  ⚠️  ZH 合成失敗 [${slug}]: ${e instanceof Error ? e.message : e}`);
        zh.failed++;
      }
    }
  }
  progressDone();

  return { en, zh };
}

function syncD1(audioUrl: string, slug: string): void {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) throw new Error('缺少 CLOUDFLARE_ACCOUNT_ID 或 CLOUDFLARE_API_TOKEN');
  const dbId = '0bec497e-9de7-4069-bc90-7d0da0f72e9a';
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`;
  const body = JSON.stringify({ sql: `UPDATE posts SET audio_url=? WHERE slug=?`, params: [audioUrl, slug] });
  execSync(
    `curl -sf -X POST "${url}" -H "Authorization: Bearer ${apiToken}" -H "Content-Type: application/json" -d '${body.replace(/'/g, "'\\''")}'`,
    { stdio: 'inherit' }
  );
}

// ── 報告 ──────────────────────────────────────────────────────────────────────

function printReport(
  scriptStats: { en: StageStats; zh: StageStats },
  mapStats: StageStats,
  audioStats: { en: StageStats; zh: StageStats },
): void {
  const pad = (n: number, label: string) => `${label}${n}`;
  const row = (s: StageStats) =>
    `新${s.generated} 快取${s.cached} 跳過${s.skipped} 失敗${s.failed}`;

  console.log('\n══════════════════════════════════════');
  console.log('TTS Pipeline 報告');
  console.log('══════════════════════════════════════');
  console.log(`階段一（逐字稿）  EN: ${row(scriptStats.en)}   ZH: ${row(scriptStats.zh)}`);
  console.log(`階段二（對齊映射）     ${row(mapStats)}`);
  console.log(`階段三（音頻）     EN: 新${audioStats.en.generated} 已有${audioStats.en.skipped} 失敗${audioStats.en.failed}   ZH: 新${audioStats.zh.generated} 已有${audioStats.zh.skipped} 失敗${audioStats.zh.failed}`);

  const totalFailed =
    scriptStats.en.failed + scriptStats.zh.failed +
    mapStats.failed +
    audioStats.en.failed + audioStats.zh.failed;
  console.log('══════════════════════════════════════');
  console.log(totalFailed > 0 ? `⚠️  完成（${totalFailed} 項失敗）` : '✅ 全部完成');
}

// ── 主流程 ────────────────────────────────────────────────────────────────────

async function main() {
  let pairs: PostPair[];

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
    pairs = [{ enPath, zhPath, category, slug }];
  } else {
    pairs = getPairs();
    // 純中文文章（無對應 .en.md）不在此批次範圍，需另行處理音頻合成
    console.log(`🔍 找到 ${pairs.length} 個配對`);
  }

  const scriptStats = await stageScripts(pairs);
  const mapStats = await stageMaps(pairs);
  const audioStats = await stageAudio(pairs);

  printReport(scriptStats, mapStats, audioStats);
}

main().catch(console.error);
