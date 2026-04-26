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

async function generate() {
  // 1. 載入字型（Satori 必須要有字型才能渲染）
  // 建議下載一個 NotoSansTC 放在 scripts/font.ttf，或暫時用系統字型
  const fontPath = path.join(process.cwd(), 'node_modules/@fontsource/noto-sans-tc/files/noto-sans-tc-chinese-traditional-900-normal.woff');
  let fontData;
  try {
    fontData = fs.readFileSync(fontPath);
  } catch (e) {
    console.warn('未找到 Noto Sans TC 字型檔案，請確保已安裝 @fontsource/noto-sans-tc');
    return;
  }

  const categories = ['tech', 'product', 'learning', 'career', 'life'];
  
  for (const cat of categories) {
    const catPath = path.join(POSTS_DIR, cat);
    if (!fs.existsSync(catPath)) continue;
    
    const posts = fs.readdirSync(catPath).filter(f => f.endsWith('.md'));
    
    for (const file of posts) {
      const filePath = path.join(catPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(content);
      
      // 產出路徑：例如 /og/posts-tech-my-post.png
      // 這樣才能與 BaseLayout 中的 Astro.url.pathname 匹配
      const slug = file.replace('.md', '');
      const filename = `posts-${cat}-${slug}.png`;
      const outputPath = path.join(OUTPUT_DIR, filename);
      
      if (fs.existsSync(outputPath) && !FORCE) continue; 

      console.log(`🎨 ${FORCE ? 'Regenerating' : 'Generating'} OG Image for: ${data.title}...`);

      const svg = await satori(
        {
          type: 'div',
          props: {
            style: {
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              backgroundColor: '#000',
              padding: '80px',
              fontFamily: 'Noto Sans TC',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    backgroundColor: '#0a84ff',
                    color: '#fff',
                    padding: '8px 20px',
                    borderRadius: '100px',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginBottom: '40px',
                    textTransform: 'uppercase',
                  },
                  children: cat,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '72px',
                    fontWeight: '900',
                    color: '#fff',
                    lineHeight: 1.2,
                    marginBottom: '20px',
                  },
                  children: data.title,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '28px',
                    color: 'rgba(255,255,255,0.5)',
                  },
                  children: 'Engineer News | 技術決策即文件',
                },
              },
            ],
          },
        },
        {
          width: 1200,
          height: 630,
          fonts: [
            {
              name: 'Noto Sans TC',
              data: fontData,
              weight: 900,
              style: 'normal',
            },
          ],
        }
      );

      const resvg = new Resvg(svg, {
        background: 'rgba(0,0,0,1)',
      });
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();

      fs.writeFileSync(outputPath, pngBuffer);
    }
  }
  console.log('✅ OG Image generation complete!');
}

generate().catch(console.error);
