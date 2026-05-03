import fs from 'node:fs';
import path from 'node:path';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');

function walkMd(dir: string): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walkMd(full));
    else if (entry.name.endsWith('.md')) result.push(full);
  }
  return result;
}

function setDraft(filePath: string, value: boolean): void {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/^draft:\s*(true|false)/m, `draft: ${value}`);
  fs.writeFileSync(filePath, content, 'utf-8');
}

const allMd = walkMd(POSTS_DIR);
const enFiles = allMd.filter(f => f.endsWith('.en.md'));
const crawlZhPaths = new Set(enFiles.map(f => f.replace(/\.en\.md$/, '.md')));

let crawlCount = 0;
let manualCount = 0;

for (const enPath of enFiles) {
  setDraft(enPath, true);
  crawlCount++;
  const zhPath = enPath.replace(/\.en\.md$/, '.md');
  if (fs.existsSync(zhPath)) {
    setDraft(zhPath, true);
    crawlCount++;
  }
}

for (const mdPath of allMd.filter(f => !f.endsWith('.en.md') && !crawlZhPaths.has(f))) {
  setDraft(mdPath, false);
  manualCount++;
}

console.log(`✅ Set draft:true on ${crawlCount} crawl posts, draft:false on ${manualCount} manual posts`);
