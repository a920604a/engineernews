import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
// @ts-ignore
import satori from 'satori';
// @ts-ignore
import { Resvg } from '@resvg/resvg-js';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const OUTPUT_DIR = path.join(process.cwd(), 'public/og');
const FORCE = process.argv.includes('--force');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 遞迴取得所有 .md 檔案
function getMdFiles(dir: string, base: string = ''): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries.flatMap((entry) => {
    const relPath = path.join(base, entry.name);
    if (entry.isDirectory()) {
      return getMdFiles(path.join(dir, entry.name), relPath);
    }
    return entry.name.endsWith('.md') ? [relPath] : [];
  });
  return files;
}

async function generate() {
  const fontPath = path.join(process.cwd(), 'node_modules/@fontsource/noto-sans-tc/files/noto-sans-tc-chinese-traditional-900-normal.woff');
  let fontData;
  try {
    fontData = fs.readFileSync(fontPath);
  } catch (e) {
    console.warn('未找到 Noto Sans TC 字型檔案');
    return;
  }

  const files = getMdFiles(POSTS_DIR);
  
  for (const file of files) {
    const filePath = path.join(POSTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);
    
    // Astro 5 post.id 的對等邏輯：tech/filename (不含 .md)
    const postId = file.replace(/\.md$/, '');
    const filename = `posts-${postId.replace(/\//g, '-')}.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    
    if (fs.existsSync(outputPath) && !FORCE) continue; 

    console.log(`🎨 Generating: ${filename} (${data.title})`);

    const svg = await satori(
      {
        type: 'div',
        props: {
          style: {
            height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'flex-start', justifyContent: 'center', backgroundColor: '#000',
            padding: '80px', fontFamily: 'Noto Sans TC',
          },
          children: [
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex', backgroundColor: '#0a84ff', color: '#fff',
                  padding: '8px 20px', borderRadius: '100px', fontSize: '24px',
                  fontWeight: 'bold', marginBottom: '40px', textTransform: 'uppercase',
                },
                children: data.category || 'tech',
              },
            },
            {
              type: 'div',
              props: {
                style: { fontSize: '72px', fontWeight: '900', color: '#fff', lineHeight: 1.2, marginBottom: '20px' },
                children: data.title,
              },
            },
            {
              type: 'div',
              props: {
                style: { fontSize: '28px', color: 'rgba(255,255,255,0.5)' },
                children: 'Engineer News | 技術決策即文件',
              },
            },
          ],
        },
      },
      {
        width: 1200, height: 630,
        fonts: [{ name: 'Noto Sans TC', data: fontData, weight: 900, style: 'normal' }],
      }
    );

    const resvg = new Resvg(svg, { background: 'rgba(0,0,0,1)' });
    fs.writeFileSync(outputPath, resvg.render().asPng());
  }
  console.log('✅ OG Generation Done!');
}

generate().catch(console.error);
