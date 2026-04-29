import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { execSync } from 'node:child_process';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const DB_NAME = 'engineer-news-db';
const VECTOR_INDEX = 'engineer-news-index';
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const isProd = process.argv.includes('--prod');
const targetFileArg = process.argv.find(a => a.startsWith('--file='))?.slice(7);
const remoteFlag = isProd ? '--remote' : '--local';

// ── Workflow report ───────────────────────────────────────────────────────────

interface StageResult {
  name: string;
  durationMs: number;
  error?: string;
}

const report = {
  startTime: Date.now(),
  stages: [] as StageResult[],
  errors: [] as string[],

  recordError(msg: string) {
    this.errors.push(msg);
  },

  async runStage<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const t0 = Date.now();
    try {
      const result = await fn();
      this.stages.push({ name, durationMs: Date.now() - t0 });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.stages.push({ name, durationMs: Date.now() - t0, error: msg });
      this.errors.push(`[${name}] ${msg}`);
      throw err;
    }
  },

  print() {
    const totalMs = Date.now() - this.startTime;
    const fmt = (ms: number) =>
      ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;

    console.log('\n' + '─'.repeat(60));
    console.log('📊 Workflow Report');
    console.log('─'.repeat(60));
    console.log(`  Total time : ${fmt(totalMs)}`);
    console.log(`  Stages     : ${this.stages.length}`);
    console.log(`  Errors     : ${this.errors.length}`);
    console.log('');
    console.log('  Stage breakdown:');
    for (const s of this.stages) {
      const status = s.error ? '✗' : '✓';
      console.log(`    ${status} ${s.name.padEnd(25)} ${fmt(s.durationMs)}${s.error ? `  ← ${s.error}` : ''}`);
    }
    if (this.errors.length > 0) {
      console.log('');
      console.log('  Error log:');
      for (const e of this.errors) {
        console.log(`    ✗ ${e}`);
      }
    }
    console.log('─'.repeat(60));
  },
};

// ── Utilities ────────────────────────────────────────────────────────────────

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

function computeHash(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function sourceHash(sourceId: string): string {
  return createHash('sha1').update(sourceId).digest('hex').slice(0, 16);
}

function chunkId(sourceType: string, sourceId: string, index: number): string {
  return `${sourceType}:${sourceHash(sourceId)}-${index}`;
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

// ── SQL helpers ───────────────────────────────────────────────────────────────

// Execute multiple SQL statements in ONE wrangler call
function runSqlBatch(statements: string[]) {
  if (statements.length === 0) return;
  const tmp = path.join(process.cwd(), `.tmp_sync_${Date.now()}.sql`);
  fs.writeFileSync(tmp, statements.join('\n'));
  try {
    execSync(`wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${tmp} --yes`, { stdio: 'inherit' });
  } finally {
    fs.unlinkSync(tmp);
  }
}

function querySql<T = any>(sql: string): T[] {
  const tmp = path.join(process.cwd(), `.tmp_query_${Date.now()}.sql`);
  fs.writeFileSync(tmp, sql);
  try {
    const out = execSync(
      `wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${tmp} --yes --json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'inherit'] }
    );
    const parsed = JSON.parse(out);
    return parsed?.[0]?.results ?? [];
  } catch {
    return [];
  } finally {
    fs.unlinkSync(tmp);
  }
}

// ── Hash map loading ──────────────────────────────────────────────────────────

function loadExistingHashes(table: 'posts' | 'projects'): Map<string, string | null> {
  const rows = querySql<{ id: string; content_hash: string | null }>(
    `SELECT id, content_hash FROM ${table};`
  );
  return new Map(rows.map(r => [r.id, r.content_hash]));
}

// ── Vectorize helpers ─────────────────────────────────────────────────────────

function deleteVectorsBatch(ids: string[], batchSize = 500) {
  if (!isProd || ids.length === 0) return;
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    try {
      execSync(
        `wrangler vectorize delete-vectors ${VECTOR_INDEX} --ids ${chunk.join(' ')} --force`,
        { stdio: 'inherit' }
      );
    } catch (e) {
      const msg = `vectorize delete-vectors 失敗（將忽略舊向量）：${(e as Error).message}`;
      console.warn(`  ⚠️  ${msg}`);
      report.recordError(msg);
    }
  }
}

function insertVectorsBatch(vectors: Array<{ id: string; values: number[]; metadata: object }>) {
  if (!isProd || vectors.length === 0) return;
  const ndjson = vectors.map(v => JSON.stringify(v)).join('\n');
  const tmp = path.join(process.cwd(), `.tmp_vec_${Date.now()}.ndjson`);
  fs.writeFileSync(tmp, ndjson);
  try {
    execSync(`wrangler vectorize insert ${VECTOR_INDEX} --file=${tmp}`, { stdio: 'inherit' });
  } finally {
    fs.unlinkSync(tmp);
  }
}

async function getEmbedding(text: string): Promise<number[] | null> {
  if (!ACCOUNT_ID || !API_TOKEN) return null;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}` },
      body: JSON.stringify({ text }),
    }
  );
  const json: any = await res.json();
  return json.result?.data?.[0] ?? null;
}

// Parallel embeddings with concurrency cap to avoid rate limiting
async function getEmbeddingsConcurrent(texts: string[], concurrency = 10): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(t => getEmbedding(t)));
    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j];
    }
  }
  return results;
}

// ── Orphan cleanup ────────────────────────────────────────────────────────────

async function cleanupOrphans(
  table: 'posts' | 'projects',
  localIds: Set<string>
) {
  const sourceType = table === 'posts' ? 'post' : 'project';
  const rows = querySql<{ id: string }>(`SELECT id FROM ${table};`);
  const orphanIds = rows.map(r => r.id).filter(id => !localIds.has(id));

  if (orphanIds.length === 0) return;

  console.log(`  🗑️  ${orphanIds.length} orphan(s): ${orphanIds.join(', ')}`);

  // Batch delete old vectors for all orphans in one call
  if (isProd) {
    const inClause = orphanIds.map(id => `'${esc(id)}'`).join(',');
    const chunkRows = querySql<{ id: string }>(
      `SELECT id FROM doc_chunks WHERE source_id IN (${inClause}) AND source_type='${sourceType}';`
    );
    deleteVectorsBatch(chunkRows.map(r => r.id));
  }

  // Batch SQL for all orphans in one call
  const sql: string[] = [];
  const inClause = orphanIds.map(id => `'${esc(id)}'`).join(',');
  sql.push(`DELETE FROM doc_chunks WHERE source_id IN (${inClause}) AND source_type='${sourceType}';`);
  sql.push(`DELETE FROM ${table} WHERE id IN (${inClause});`);
  runSqlBatch(sql);
}

// ── Sync posts ────────────────────────────────────────────────────────────────

interface PostData {
  id: string;
  slug: string;
  title: string;
  category: string;
  lang: string;
  description: string;
  tldr: string;
  content: string;
  tags: string;
  hash: string;
  created_at: string;
  updated_at: string;
  audio_url: string;
  chunks: string[];
}

async function syncPosts() {
  const files = targetFileArg
    ? [path.isAbsolute(targetFileArg) ? targetFileArg : path.join(process.cwd(), targetFileArg)]
    : walkMdFiles(POSTS_DIR);
  const existingHashes = loadExistingHashes('posts');
  const localIds = new Set<string>();
  let skipped = 0;

  // Phase 1: Identify changed posts
  const changedPosts: PostData[] = [];

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const rel = path.relative(POSTS_DIR, filePath);
    const id = rel.replace(/\.md$/, '');
    localIds.add(id);

    const hash = computeHash(raw);
    if (existingHashes.get(id) === hash) {
      skipped++;
      continue;
    }

    const { data, content } = matter(raw);
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

    changedPosts.push({
      id, slug, title, category, lang, description, tldr, content, tags, hash,
      created_at, updated_at, audio_url: data.audio_url ?? '',
      chunks: chunkText(content),
    });
  }

  console.log(`Found ${files.length} posts. ${changedPosts.length} changed, ${skipped} skipped.`);

  if (changedPosts.length === 0) {
    if (!targetFileArg) await cleanupOrphans('posts', localIds);
    return;
  }

  // Phase 2: Batch delete old vectors (ONE vectorize call)
  if (isProd) {
    const postIds = changedPosts.map(p => p.id);
    const inClause = postIds.map(id => `'${esc(id)}'`).join(',');
    const oldChunkRows = querySql<{ id: string }>(
      `SELECT id FROM doc_chunks WHERE source_id IN (${inClause}) AND source_type='post';`
    );
    deleteVectorsBatch(oldChunkRows.map(r => r.id));
  }

  // Phase 3: Build all SQL and execute in ONE d1 call
  const sqlStatements: string[] = [];
  for (const post of changedPosts) {
    const { id, slug, title, category, lang, description, tldr, content, tags, hash, created_at, updated_at, audio_url, chunks } = post;
    console.log(`  post: ${id}`);

    sqlStatements.push(`DELETE FROM posts WHERE slug='${esc(slug)}' AND id!='${esc(id)}';`);
    sqlStatements.push(`
INSERT INTO posts (id, slug, title, category, lang, description, tldr, content, tags, content_hash, created_at, updated_at, audio_url)
VALUES ('${esc(id)}','${esc(slug)}','${esc(title)}','${esc(category)}','${esc(lang)}',
        '${esc(description)}','${esc(tldr)}','${esc(content)}','${esc(tags)}','${hash}',
        '${created_at}','${updated_at}','${esc(audio_url)}')
ON CONFLICT(id) DO UPDATE SET
  slug=excluded.slug, title=excluded.title, content=excluded.content,
  description=excluded.description, tldr=excluded.tldr, tags=excluded.tags,
  content_hash=excluded.content_hash, updated_at=excluded.updated_at,
  audio_url=CASE WHEN excluded.audio_url != '' THEN excluded.audio_url ELSE posts.audio_url END;`);

    sqlStatements.push(`DELETE FROM doc_chunks WHERE source_id='${esc(id)}' AND source_type='post';`);

    for (let i = 0; i < chunks.length; i++) {
      const cid = chunkId('post', id, i);
      sqlStatements.push(`
INSERT INTO doc_chunks (id, source_id, source_type, chunk_index, content, updated_at)
VALUES ('${esc(cid)}','${esc(id)}','post',${i},'${esc(chunks[i])}','${updated_at}')
ON CONFLICT(id) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at;`);
    }
  }

  console.log(`  Executing ${sqlStatements.length} SQL statements in one batch...`);
  runSqlBatch(sqlStatements);

  // Phase 4: Get all embeddings in parallel (concurrency 10)
  if (isProd && ACCOUNT_ID && API_TOKEN) {
    interface ChunkTask {
      id: string;
      text: string;
      metadata: { source_id: string; source_type: string; chunk_index: number; slug: string; title: string; lang: string };
    }

    const tasks: ChunkTask[] = [];
    for (const post of changedPosts) {
      for (let i = 0; i < post.chunks.length; i++) {
        tasks.push({
          id: chunkId('post', post.id, i),
          text: post.chunks[i],
          metadata: { source_id: post.id, source_type: 'post', chunk_index: i, slug: post.slug, title: post.title, lang: post.lang },
        });
      }
    }

    console.log(`  Getting ${tasks.length} embeddings (concurrency=10)...`);
    const vectors = await getEmbeddingsConcurrent(tasks.map(t => t.text));

    // Phase 5: Insert all vectors in ONE vectorize call (NDJSON)
    const vectorEntries = tasks
      .map((t, i) => vectors[i] ? { id: t.id, values: vectors[i]!, metadata: t.metadata } : null)
      .filter(Boolean) as Array<{ id: string; values: number[]; metadata: object }>;

    if (vectorEntries.length > 0) {
      console.log(`  Inserting ${vectorEntries.length} vectors in one batch...`);
      insertVectorsBatch(vectorEntries);
    }
  }

  console.log(`  ✓ ${changedPosts.length} synced, ${skipped} skipped (unchanged)`);
  if (!targetFileArg) await cleanupOrphans('posts', localIds);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🚀 Syncing to D1 (${isProd ? 'remote' : 'local'})...`);

  let success = true;
  try {
    await report.runStage('sync posts', syncPosts);
  } catch (err) {
    success = false;
  }

  report.print();

  if (!success) {
    process.exit(1);
  }
  console.log('✅ Done.');
}

main();
