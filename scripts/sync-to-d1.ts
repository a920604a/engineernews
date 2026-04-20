import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { execSync } from 'node:child_process';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const PROJECTS_DIR = path.join(process.cwd(), 'src/content/projects');
const DB_NAME = 'engineer-news-db';
const VECTOR_INDEX = 'engineer-news-index';
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const isProd = process.argv.includes('--prod');
const remoteFlag = isProd ? '--remote' : '--local';

function walkMdFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkMdFiles(full));
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

function esc(s: string) {
  return s.replace(/'/g, "''");
}

function runSql(sql: string) {
  const tmp = path.join(process.cwd(), `.tmp_sync_${Date.now()}.sql`);
  fs.writeFileSync(tmp, sql);
  try {
    execSync(`wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${tmp} --yes`, { stdio: 'inherit' });
  } finally {
    fs.unlinkSync(tmp);
  }
}

function chunkText(text: string, maxLength = 1000): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';
  for (const p of paragraphs) {
    if ((current + p).length > maxLength) {
      if (current) chunks.push(current.trim());
      current = p;
    } else {
      current += (current ? '\n\n' : '') + p;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

async function getEmbedding(text: string): Promise<number[] | null> {
  if (!ACCOUNT_ID || !API_TOKEN) return null;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/baai/bge-small-en-v1.5`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}` },
      body: JSON.stringify({ text }),
    }
  );
  const json: any = await res.json();
  return json.result?.data?.[0] ?? null;
}

async function syncChunks(
  sourceId: string,
  sourceType: 'post' | 'project',
  content: string,
  meta: { slug: string; title: string }
) {
  execSync(
    `wrangler d1 execute ${DB_NAME} ${remoteFlag} --command="DELETE FROM doc_chunks WHERE source_id='${esc(sourceId)}' AND source_type='${sourceType}'" --yes`,
    { stdio: 'inherit' }
  );

  const parts = chunkText(content);
  for (let i = 0; i < parts.length; i++) {
    const chunkId = `${sourceType}:${sourceId}-chunk-${i}`;
    const updated_at = new Date().toISOString().split('T')[0];
    runSql(
      `INSERT INTO doc_chunks (id, source_id, source_type, chunk_index, content, updated_at)
       VALUES ('${esc(chunkId)}','${esc(sourceId)}','${sourceType}',${i},'${esc(parts[i])}','${updated_at}')
       ON CONFLICT(id) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at`
    );

    if (isProd && ACCOUNT_ID && API_TOKEN) {
      const vector = await getEmbedding(parts[i]);
      if (vector) {
        const tmp = path.join(process.cwd(), `.tmp_vec_${Date.now()}.json`);
        fs.writeFileSync(tmp, JSON.stringify({
          id: chunkId,
          values: vector,
          metadata: { source_id: sourceId, source_type: sourceType, slug: meta.slug, title: meta.title },
        }));
        try {
          execSync(`wrangler vectorize insert ${VECTOR_INDEX} --file=${tmp}`, { stdio: 'inherit' });
        } finally {
          fs.unlinkSync(tmp);
        }
      }
    }
  }
}

async function syncPosts() {
  const files = walkMdFiles(POSTS_DIR);
  console.log(`Found ${files.length} posts.`);

  for (const filePath of files) {
    const rel = path.relative(POSTS_DIR, filePath);
    const id = rel.replace(/\.md$/, '');
    const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'));

    const slug = data.slug || path.basename(id);
    const title = data.title || 'Untitled';
    const category = data.category || id.split('/')[0] || 'tech';
    const lang = data.lang || 'zh-TW';
    const description = data.description || '';
    const tldr = data.tldr || '';
    const tags = JSON.stringify(data.tags || []);
    const created_at = data.date
      ? new Date(data.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const updated_at = new Date().toISOString().split('T')[0];

    console.log(`  post: ${id}`);

    runSql(`
      INSERT INTO posts (id, slug, title, category, lang, description, tldr, content, tags, created_at, updated_at)
      VALUES ('${esc(id)}','${esc(slug)}','${esc(title)}','${esc(category)}','${esc(lang)}',
              '${esc(description)}','${esc(tldr)}','${esc(content)}','${esc(tags)}',
              '${created_at}','${updated_at}')
      ON CONFLICT(id) DO UPDATE SET
        slug=excluded.slug, title=excluded.title, content=excluded.content,
        description=excluded.description, tldr=excluded.tldr, tags=excluded.tags,
        updated_at=excluded.updated_at;
    `);

    await syncChunks(id, 'post', content, { slug, title });
  }
}

async function syncProjects() {
  const files = walkMdFiles(PROJECTS_DIR);
  console.log(`Found ${files.length} projects.`);

  for (const filePath of files) {
    const id = path.basename(filePath, '.md');
    const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'));

    const title = data.title || id;
    const desc = typeof data.description === 'string'
      ? data.description
      : data.description?.background || '';
    const tags = JSON.stringify(data.tags || []);
    const github = data.github || '';
    const url = data.url || '';
    const tag = data.tag || '';
    const pinned = data.pinned ? 1 : 0;
    const updated_at = new Date().toISOString().split('T')[0];

    console.log(`  project: ${id}`);

    runSql(`
      INSERT INTO projects (id, title, description, tags, github, url, tag, pinned, content, updated_at)
      VALUES ('${esc(id)}','${esc(title)}','${esc(desc)}','${esc(tags)}',
              '${esc(github)}','${esc(url)}','${esc(tag)}',${pinned},'${esc(content)}','${updated_at}')
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title, description=excluded.description, tags=excluded.tags,
        github=excluded.github, url=excluded.url, tag=excluded.tag,
        pinned=excluded.pinned, content=excluded.content, updated_at=excluded.updated_at;
    `);

    await syncChunks(id, 'project', content, { slug: id, title });
  }
}

async function main() {
  console.log(`🚀 Syncing to D1 (${isProd ? 'remote' : 'local'})...`);
  await syncPosts();
  await syncProjects();
  console.log('✅ Done.');
}

main();
