import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

export interface Voice {
  name: string;
  gender: string;
  locale: string;
}

export interface SynthesizeRequest {
  text: string;
  voice?: string | Voice;
}

export interface SynthesizeResult {
  audio_url: string;
  srt_url: string;
  history_id: number;
}

export const DEFAULT_TTS_API_URL = 'http://localhost:8008';
export const R2_BUCKET_NAME = 'engineer-news-og-images';

/**
 * Feature toggle: controls which TTS backend is used.
 *
 *   edge   – local Edge TTS server only (default; CF AI code is preserved but skipped)
 *   cf-ai  – Cloudflare Workers AI only
 *   auto   – try Edge TTS first, fall back to CF AI if unavailable
 *
 * Set via env var TTS_PROVIDER=edge|cf-ai|auto
 */
export type TTSProvider = 'edge' | 'cf-ai' | 'auto';
export const TTS_PROVIDER: TTSProvider =
  (['edge', 'cf-ai', 'auto'] as TTSProvider[]).includes(
    process.env.TTS_PROVIDER as TTSProvider
  )
    ? (process.env.TTS_PROVIDER as TTSProvider)
    : 'edge';

export async function listVoices(baseUrl: string = ''): Promise<Voice[]> {
  const res = await fetch(`${baseUrl}/api/tts/voices`);
  if (!res.ok) throw new Error('無法取得語音列表');
  return res.json();
}

export async function synthesize(
  req: SynthesizeRequest,
  baseUrl: string = ''
): Promise<SynthesizeResult> {
  const res = await fetch(`${baseUrl}/api/tts/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? '合成失敗');
  }

  return res.json();
}

/**
 * 從指定 URL 下載檔案到本地
 */
export async function downloadFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下載失敗: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

/**
 * 將本地檔案上傳至 R2 儲存桶
 */
export function uploadToR2(localPath: string, r2Key: string, isProd: boolean = false): void {
  const remoteFlag = isProd ? '--remote' : '--local';
  const contentType = r2Key.endsWith('.wav') ? 'audio/wav' : r2Key.endsWith('.mp3') ? 'audio/mpeg' : r2Key.endsWith('.srt') ? 'text/plain' : 'application/octet-stream';
  console.log(`  📤 上傳至 R2: ${r2Key} (${isProd ? 'remote' : 'local'})`);
  execSync(`wrangler r2 object put ${R2_BUCKET_NAME}/${r2Key} --file="${localPath}" --content-type="${contentType}" ${remoteFlag}`, { stdio: 'inherit' });
}

/**
 * 獲取 R2 檔案的公開 URL（透過本地代理）
 */
export function getR2PublicUrl(r2Key: string): string {
  return `/api/tts/r2/${r2Key}`;
}

/**
 * 智慧過濾 Markdown 內容，準備用於 TTS 朗讀
 */
export function processTextForTTS(title: string, tldr: string, content: string): string {
  // 開場白
  let processed = `您好，歡迎收聽 Engineer News。今天為您導讀的文章標題是：${title}。\n`;
  
  if (tldr) {
    processed += `本篇摘要：${tldr}。\n`;
  }

  processed += `導讀開始。\n\n`;

  // 移除 Frontmatter (如果傳入的是完整內容)
  const mainContent = content.replace(/^---[\s\S]*?---\n*/, '');

  // 處理標題與內文
  // 透過正則拆分章節，但保留標題內容
  const sections = mainContent.split(/\n(?=#{1,6}\s)/);
  
  for (const section of sections) {
    // 提取並格式化章節標題
    const headerMatch = section.match(/^(#{1,6})\s+(.*)/);
    if (headerMatch) {
      const headerText = headerMatch[2];
      processed += `\n章節標題：${headerText}。\n`;
    }

    // 獲取該章節正文
    let sectionBody = section.replace(/^#{1,6}\s+.*?\n/, '');

    // 1. 強力移除所有圖片語法 ![]() 或 <img>
    sectionBody = sectionBody.replace(/!\[[^\]]*\]\([^\)]+\)/g, '');
    sectionBody = sectionBody.replace(/<img[^>]*>/gi, '');

    // 2. 處理程式碼區塊 (Block)
    sectionBody = sectionBody.replace(/```[\s\S]*?```/g, '\n此處有程式碼範例，已跳過詳細內容。\n');

    // 3. 處理行內程式碼 (Inline)
    sectionBody = sectionBody.replace(/`([^`]+)`/g, '$1');

    // 4. 處理連結，只保留顯示文字
    sectionBody = sectionBody.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    // 5. 移除其餘 Markdown 符號 (粗體、斜體)
    sectionBody = sectionBody.replace(/[\*_]{1,3}([^\*_]+)[\*_]{1,3}/g, '$1');
    
    // 6. 移除 HTML 標籤
    sectionBody = sectionBody.replace(/<[^>]*>/g, '');

    processed += sectionBody;
  }

  // 結尾詞
  processed += `\n\n以上是文章「${title}」的導讀內容。感謝您的收聽，我們下次見。`;

  return processed.trim();
}

/**
 * 檢查 Edge TTS server 是否可用（3 秒 timeout）
 */
export async function checkEdgeTTSHealth(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    // Use GET instead of HEAD: FastAPI APIRouter + StaticFiles mount("/") causes
    // HEAD requests to fall through to the static handler and return 404.
    const res = await fetch(`${baseUrl}/api/tts/voices`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 透過 Cloudflare Workers AI REST API 合成音訊，回傳 MP3 binary
 * lang: 'en' → @cf/deepgram/aura-2-en
 * 其他   → @cf/myshell-ai/melotts (lang='zh')
 */
export async function synthesizeCFAI(
  text: string,
  lang: string,
  accountId: string,
  apiToken: string
): Promise<ArrayBuffer> {
  const isEnglish = lang === 'en' || lang.startsWith('en-');
  const model = isEnglish ? '@cf/deepgram/aura-2-en' : '@cf/myshell-ai/melotts';
  const body = isEnglish
    ? { text, encoding: 'mp3' }
    : { prompt: text, lang: 'zh' };

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CF AI TTS 失敗 (${res.status}): ${err}`);
  }

  const ct = res.headers.get('content-type') ?? '';

  // 若回傳 binary audio（部分模型如 aura-2-en 直接回傳）
  if (ct.includes('audio/') || ct.includes('application/octet-stream')) {
    return res.arrayBuffer();
  }

  // CF AI REST API 將音訊包在 JSON envelope 中，audio 欄位為 base64
  // { "result": { "audio": "base64..." }, "success": true }
  const json = await res.json() as any;
  const audioB64: string | undefined = json?.result?.audio ?? json?.audio;
  if (!audioB64 || typeof audioB64 !== 'string') {
    throw new Error(`CF AI: 未預期的回應格式 (content-type: ${ct}, keys: ${Object.keys(json?.result ?? json ?? {}).join(',')})`);
  }

  const binary = Buffer.from(audioB64, 'base64');
  return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer;
}

export interface SynthesizeWithFallbackOpts {
  ttsApiUrl: string;
  voice?: string;
  accountId?: string;
  apiToken?: string;
  isProd?: boolean;
}

/**
 * 統一合成入口，行為由 TTS_PROVIDER 環境變數控制：
 *   edge  – 僅使用本地 Edge TTS server（預設）
 *   cf-ai – 僅使用 Cloudflare Workers AI
 *   auto  – 先試 Edge TTS，不可用時 fallback 到 CF AI
 *
 * 回傳 R2 public URL（/api/tts/r2/tts/{filename}）
 */
export async function synthesizeWithFallback(
  text: string,
  lang: string,
  slug: string,
  opts: SynthesizeWithFallbackOpts
): Promise<string> {
  const { ttsApiUrl, voice, accountId, apiToken, isProd = false } = opts;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-fallback-'));
  const provider = TTS_PROVIDER;

  try {
    const useEdge = provider === 'edge' || provider === 'auto';
    const useCFAI = provider === 'cf-ai';

    if (useEdge) {
      const healthy = await checkEdgeTTSHealth(ttsApiUrl);
      if (healthy) {
        const result = await synthesize({ text, voice }, ttsApiUrl);
        const audioFilename = path.basename(result.audio_url);
        const apiBase = ttsApiUrl.replace(/\/$/, '');
        const localPath = path.join(tmpDir, audioFilename);
        await downloadFile(`${apiBase}${result.audio_url}`, localPath);
        uploadToR2(localPath, `tts/${audioFilename}`, isProd);
        return getR2PublicUrl(`tts/${audioFilename}`);
      }
      if (provider === 'edge') {
        throw new Error(`Edge TTS server 無回應 (${ttsApiUrl})，TTS_PROVIDER=edge 下不啟用 fallback`);
      }
      // provider === 'auto': fall through to CF AI
    }

    if (useCFAI || provider === 'auto') {
      if (!accountId || !apiToken) {
        throw new Error('CF AI: CLOUDFLARE_ACCOUNT_ID 或 CLOUDFLARE_API_TOKEN 未設定');
      }
      const modelName = lang === 'en' || lang.startsWith('en-') ? 'aura-2-en' : 'melotts';
      if (provider === 'auto') {
        console.log(`  🔄 Edge TTS 不可用，改用 CF AI (${modelName})...`);
      } else {
        console.log(`  ☁️  使用 CF AI TTS (${modelName})...`);
      }
      const audioBuffer = await synthesizeCFAI(text, lang, accountId, apiToken);
      const r2Key = `tts/${slug}.mp3`;
      const localPath = path.join(tmpDir, `${slug}.mp3`);
      fs.writeFileSync(localPath, Buffer.from(audioBuffer));
      uploadToR2(localPath, r2Key, isProd);
      return getR2PublicUrl(r2Key);
    }

    throw new Error(`未知的 TTS_PROVIDER 值: ${provider}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
