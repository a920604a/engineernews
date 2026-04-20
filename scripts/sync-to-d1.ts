import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { execSync } from 'node:child_process';

const CONTENT_DIR = path.join(process.cwd(), 'src/content/posts');
const DB_NAME = 'engineer-news-db';
const VECTOR_INDEX = 'engineer-news-index';
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

interface Post {
  id: string;
  slug: string;
  title: string;
  category: string;
  lang: string;
  description: string;
  tldr: string;
  content: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

// 簡單的分塊邏輯：按段落切割，每塊不超過 1000 字
function chunkText(text: string, maxLength = 1000): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const p of paragraphs) {
    if ((currentChunk + p).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = p;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + p;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

async function getEmbedding(text: string) {
  if (!ACCOUNT_ID || !API_TOKEN) return null;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/baai/bge-small-en-v1.5`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}` },
      body: JSON.stringify({ text })
    }
  );
  const json = await response.json();
  return json.result?.data?.[0];
}

async function sync() {
  console.log('🚀 Starting sync to D1 and Vectorize...');

  if (!fs.existsSync(CONTENT_DIR)) {
    console.log('⚠️ Content directory does not exist. Skipping.');
    return;
  }

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} posts.`);

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    const slug = file.replace('.md', '');
    const postId = data.id || slug;

    const post: Post = {
      id: postId,
      slug: data.slug || slug,
      title: data.title || 'Untitled',
      category: data.category || 'tech',
      lang: data.lang || 'zh-tw',
      description: data.description || '',
      tldr: data.tldr || '',
      content: content,
      tags: JSON.stringify(data.tags || []),
      created_at: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };

    console.log(`Syncing post: ${post.title} (${post.slug})`);

    // 1. 同步到 posts 表
    const sql = `
      INSERT INTO posts (id, slug, title, category, lang, description, tldr, content, tags, created_at, updated_at)
      VALUES ('${post.id}', '${post.slug}', '${post.title}', '${post.category}', '${post.lang}', '${post.description.replace(/'/g, "''")}', '${post.tldr.replace(/'/g, "''")}', '${post.content.replace(/'/g, "''")}', '${post.tags}', '${post.created_at}', '${post.updated_at}')
      ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, title=excluded.title, updated_at=excluded.updated_at;
    `;

    const isProd = process.argv.includes('--prod');
    const remoteFlag = isProd ? '--remote' : '--local';
    const tempSqlFile = path.join(process.cwd(), `.temp_sync_${post.id}.sql`);
    fs.writeFileSync(tempSqlFile, sql);
    execSync(`wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${tempSqlFile} --yes`, { stdio: 'inherit' });
    fs.unlinkSync(tempSqlFile);

    // 2. 同步內容塊 (Chunks)
    console.log(`  - Generating chunks and embeddings...`);
    const chunks = chunkText(content);
    
    // 先刪除舊的 chunks
    execSync(`wrangler d1 execute ${DB_NAME} ${remoteFlag} --command="DELETE FROM post_chunks WHERE post_id='${post.id}'" --yes`, { stdio: 'inherit' });

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${post.id}-chunk-${i}`;
      const chunkContent = chunks[i];

      // 存入 D1 post_chunks
      const chunkSql = `INSERT INTO post_chunks (id, post_id, chunk_index, content) VALUES ('${chunkId}', '${post.id}', ${i}, '${chunkContent.replace(/'/g, "''")}')`;
      fs.writeFileSync(tempSqlFile, chunkSql);
      execSync(`wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${tempSqlFile} --yes`, { stdio: 'inherit' });
      fs.unlinkSync(tempSqlFile);

      // 如果有 API Token，則同步到 Vectorize (僅支援遠端)
      if (isProd && ACCOUNT_ID && API_TOKEN) {
        const vector = await getEmbedding(chunkContent);
        if (vector) {
          // 使用 wrangler 直接 upsert 向量
          const vectorData = JSON.stringify({ id: chunkId, values: vector, metadata: { post_id: post.id, slug: post.slug, title: post.title } });
          const tempVectorFile = path.join(process.cwd(), `.temp_vector_${chunkId}.json`);
          fs.writeFileSync(tempVectorFile, vectorData);
          execSync(`wrangler vectorize insert ${VECTOR_INDEX} --file=${tempVectorFile}`, { stdio: 'inherit' });
          fs.unlinkSync(tempVectorFile);
        }
      }
    }
  }

  console.log('✅ Sync and Vectorization complete.');
}

sync();
