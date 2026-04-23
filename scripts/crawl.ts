import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import { SOURCES, type Source } from './sources.js';

const CRAWLED_DIR = path.join(process.cwd(), 'src/content/posts/crawled');
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const MAX_VIDEOS_PER_CHANNEL = 5;
const MAX_VIDEOS_PER_RUN = 3;

// ── Helpers ──────────────────────────────────────────────────────────────────

function isAlreadyProcessed(videoId: string): boolean {
  return fs.existsSync(path.join(CRAWLED_DIR, `${videoId}.md`));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

// ── Video Discovery (yt-dlp) ─────────────────────────────────────────────────

interface VideoEntry {
  id: string;
  title: string;
  url: string;
  description: string;
}

function getLatestVideos(source: Source): VideoEntry[] {
  const result = spawnSync(
    'python3',
    [
      '-m', 'yt_dlp',
      '--flat-playlist',
      '--print', '%(id)s|||%(title)s|||%(webpage_url)s|||%(description)s',
      '--playlist-end', String(MAX_VIDEOS_PER_CHANNEL),
      '-q',
      source.url,
    ],
    { encoding: 'utf-8', timeout: 30000 }
  );

  if (result.status !== 0 || !result.stdout.trim()) {
    console.warn(`  ⚠️  無法取得影片列表：${source.name}`);
    return [];
  }

  return result.stdout
    .trim()
    .split('\n')
    .filter(line => line.includes('|||'))
    .map(line => {
      const parts = line.split('|||');
      const [id, title, url, ...descParts] = parts;
      return {
        id: (id ?? '').trim(),
        title: (title ?? '').trim(),
        url: (url ?? '').trim(),
        description: descParts.join('|||').trim(),
      };
    })
    .filter(v => v.id && v.title && v.url);
}

// ── Subtitle Download (yt-dlp) ────────────────────────────────────────────────

function downloadSubtitles(videoUrl: string, tmpDir: string): string | null {
  const result = spawnSync(
    'python3',
    [
      '-m', 'yt_dlp',
      '--js-runtimes', 'node',
      '--remote-components', 'ejs:github',
      '--write-auto-subs',
      '--sub-lang', 'zh-TW,zh,en',
      '--sub-format', 'vtt',
      '--skip-download',
      '--output', path.join(tmpDir, '%(id)s'),
      '-q',
      videoUrl,
    ],
    { encoding: 'utf-8', timeout: 60000 }
  );

  const vttFiles = fs.readdirSync(tmpDir).filter(f => f.endsWith('.vtt'));
  if (vttFiles.length === 0) return null;

  const preferred = vttFiles.find(f => f.includes('.zh-TW.') || f.includes('.zh.')) ?? vttFiles[0];
  const raw = fs.readFileSync(path.join(tmpDir, preferred), 'utf-8');
  return parseVtt(raw);
}

function parseVtt(vtt: string): string {
  return vtt
    .split('\n')
    .filter(line => !line.startsWith('WEBVTT') && !line.match(/^\d+$/) && !line.match(/[\d:,]+ --> [\d:,]+/) && line.trim())
    .join(' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);
}

// ── Workers AI Summarize ─────────────────────────────────────────────────────

interface AISummary {
  title: string;
  tldr: string;
  tags: string[];
  category: string;
  summary: string;
}

async function summarize(content: string, sourceTags: string[]): Promise<AISummary> {
  if (!ACCOUNT_ID || !API_TOKEN) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN');
  }

  const prompt = `你是台灣工程師的學習助手。以下是 YouTube 影片的內容（字幕或簡介），請用繁體中文分析並輸出 JSON。

<content>
${content}
</content>

請輸出以下格式的 JSON（只輸出 JSON，不要其他文字）：
{
  "title": "20字以內的繁體中文標題",
  "tldr": "50字以內的一句話重點摘要（繁體中文）",
  "tags": ["標籤1", "標籤2", "標籤3"],
  "category": "tech | career | learning | tool | other",
  "summary": "300到500字的繁體中文詳細摘要，說明影片核心概念與學習重點"
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
    const parsed = JSON.parse(match?.[0] ?? '{}');
    return {
      title: parsed.title || 'Untitled',
      tldr: parsed.tldr || '',
      tags: [...(parsed.tags || []), ...sourceTags].filter((v, i, a) => a.indexOf(v) === i),
      category: parsed.category || 'tech',
      summary: parsed.summary || '',
    };
  } catch {
    return { title: 'Untitled', tldr: '', tags: sourceTags, category: 'tech', summary: '' };
  }
}

// ── Markdown Output ──────────────────────────────────────────────────────────

function writePost(videoId: string, source: Source, video: VideoEntry, ai: AISummary): string {
  const today = new Date().toISOString().split('T')[0];
  const outputPath = path.join(CRAWLED_DIR, `${videoId}.md`);

  const frontmatter = [
    '---',
    `title: "${ai.title.replace(/"/g, '\\"')}"`,
    `date: "${today}"`,
    `category: "${ai.category}"`,
    `tags: [${ai.tags.map(t => `"${t}"`).join(', ')}]`,
    `lang: "zh-TW"`,
    `tldr: "${ai.tldr.replace(/"/g, '\\"')}"`,
    `type: "crawled"`,
    `source: "${source.id}"`,
    `source_url: "${video.url}"`,
    `draft: false`,
    '---',
    '',
    ai.summary,
  ].join('\n');

  fs.writeFileSync(outputPath, frontmatter);
  return outputPath;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  return arr
    .map(v => ({ v, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ v }) => v);
}

async function crawl() {
  if (!fs.existsSync(CRAWLED_DIR)) fs.mkdirSync(CRAWLED_DIR, { recursive: true });

  const enabledSources = shuffle(SOURCES.filter(s => s.enabled && s.type === 'youtube'));
  console.log(`\n🔍 爬蟲啟動，來源數：${enabledSources.length}，今日配額：${MAX_VIDEOS_PER_RUN} 支`);

  let newCount = 0;

  for (const source of enabledSources) {
    if (newCount >= MAX_VIDEOS_PER_RUN) break;

    const videos = getLatestVideos(source);
    const newVideos = videos.filter(v => !isAlreadyProcessed(v.id));

    if (newVideos.length === 0) continue;

    // 每個來源每次最多貢獻 1 支，讓不同頻道輪流出現
    const video = newVideos[0];
    console.log(`\n📺 ${source.name} → ${video.title}`);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crawl-'));

    try {
      const subtitles = downloadSubtitles(video.url, tmpDir);
      const content = subtitles ?? `標題：${video.title}\n簡介：${video.description}`;

      if (!subtitles) console.log('  ⚠️  無字幕，使用標題+簡介 fallback');

      const ai = await summarize(content, source.tags);
      const outPath = writePost(video.id, source, video, ai);
      console.log(`  ✅ ${path.relative(process.cwd(), outPath)}`);
      newCount++;
    } catch (e) {
      console.warn(`  ❌ 處理失敗，跳過：${(e as Error).message}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  if (newCount === 0) {
    console.log('\n✓ 無新內容，結束。');
    process.exit(0);
  }

  console.log(`\n✅ 今日生成 ${newCount} 篇文章。`);
}

crawl().catch(e => {
  console.error(e);
  process.exit(1);
});
