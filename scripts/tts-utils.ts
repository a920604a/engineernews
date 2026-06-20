import fs from 'node:fs';
import { execSync } from 'node:child_process';

export const R2_BUCKET_NAME = 'engineer-news-og-images';

/**
 * 從指定 URL 下載檔案到本地 (Node-only)
 */
export async function downloadFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下載失敗: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

/**
 * 將本地檔案上傳至 R2 儲存桶 (Node-only)
 * 使用 Cloudflare REST API (curl) 取代 wrangler CLI，避免 Node.js 版本限制
 */
export function uploadToR2(localPath: string, r2Key: string, isProd: boolean = false): void {
  const contentType = r2Key.endsWith('.wav') ? 'audio/wav' : r2Key.endsWith('.mp3') ? 'audio/mpeg' : r2Key.endsWith('.srt') ? 'text/plain' : 'application/octet-stream';
  console.log(`  📤 上傳至 R2: ${r2Key} (${isProd ? 'remote' : 'local'})`);
  if (isProd) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) throw new Error('缺少 CLOUDFLARE_ACCOUNT_ID 或 CLOUDFLARE_API_TOKEN');
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${R2_BUCKET_NAME}/objects/${r2Key}`;
    execSync(
      `curl -sf -X PUT "${url}" -H "Authorization: Bearer ${apiToken}" -H "Content-Type: ${contentType}" --data-binary "@${localPath}"`,
      { stdio: 'inherit' }
    );
  } else {
    console.log(`  ⚠️  local 模式跳過 R2 上傳 (wrangler 需要 Node.js v20+)`);
  }
}
