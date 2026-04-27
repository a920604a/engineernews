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
 */
export function uploadToR2(localPath: string, r2Key: string, isProd: boolean = false): void {
  const remoteFlag = isProd ? '--remote' : '--local';
  const contentType = r2Key.endsWith('.wav') ? 'audio/wav' : r2Key.endsWith('.srt') ? 'text/plain' : 'application/octet-stream';
  console.log(`  📤 上傳至 R2: ${r2Key} (${isProd ? 'remote' : 'local'})`);
  execSync(`wrangler r2 object put ${R2_BUCKET_NAME}/${r2Key} --file="${localPath}" --content-type="${contentType}" ${remoteFlag}`, { stdio: 'inherit' });
}
