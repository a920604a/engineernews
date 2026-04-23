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

async function summarize(content: string, sourceTags: string[], videoTitle: string): Promise<AISummary> {
  if (!ACCOUNT_ID || !API_TOKEN) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN');
  }

  const prompt = `你是專為「engineer-news」平台服務的高級技術編輯，精通「post skill」寫作規範。
請將以下 YouTube 影片內容轉換為高品質的繁體中文技術文章摘要。

規範要求：
1. 分類 (Category) 邏輯：
   - tech: 技術問題解決、工具介紹、架構設計、工程實踐
   - learning: 概念解說、知識整理、AI、研究主題
   - career: 職涯發展、個人成長
2. 標題 (Title) 原則：
   - 具體且直接。如果是 tech 類，標題需包含關鍵字；如果是介紹文，直接點出主題。
3. 語氣與風格：
   - 直接、具體、不客套。使用台灣繁體中文慣用語（如「資訊」、「內容」、「程式碼」）。
4. 視覺輔助 (Mermaid)：
   - **重要**：如果內容涉及「流程」、「架構關係」，請主動加入 Mermaid 圖表（flowchart/graph）。

<content>
影片標題：${videoTitle}
內容（字幕/簡介）：${content}
</content>

請輸出以下格式的 JSON（只輸出 JSON，不要其他文字）：
{
  "title": "符合規範的文章標題",
  "tldr": "50字以內的一句話重點摘要",
  "tags": ["標籤1", "標籤2", "標籤3"],
  "category": "tech | learning | career",
  "summary": "300到800字的詳細摘要，說明影片核心概念與學習重點，使用 Markdown 格式（可含 Mermaid）。"
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
  const outputPath = path.join(CRAWLED_DIR, `${today}-${slugify(video.title) || video.id}.md`);

  // 強制補強參考資料
  let finalSummary = ai.summary;
  if (!finalSummary.includes('## 參考資料')) {
    finalSummary += `\n\n## 參考資料\n\n- [${video.title}](${video.url})`;
  }

  const frontmatter = [
    '---',
    `title: "${ai.title.replace(/"/g, '\\"')}"`,
    `date: ${today}`,
    `category: ${ai.category}`,
    `tags: [${ai.tags.map(t => `"${t}"`).join(', ')}]`,
    `lang: zh-TW`,
    `tldr: "${ai.tldr.replace(/"/g, '\\"')}"`,
    `description: "${ai.tldr.replace(/"/g, '\\"')}"`,
    `original_url: "${video.url}"`,
    `draft: false`,
    '---',
    '',
    finalSummary,
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

      const ai = await summarize(content, source.tags, video.title);
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
