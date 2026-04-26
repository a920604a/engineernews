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
      console.log(`    ${status} ${s.name.padEnd(20)} ${fmt(s.durationMs)}${s.error ? `  ← ${s.error}` : ''}`);
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

// ── SQL helpers ───────────────────────────────────────────────────────────────

function runSql(sql: string) {
  const tmp = path.join(process.cwd(), `.tmp_sync_${Date.now()}.sql`);
  fs.writeFileSync(tmp, sql);
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

function getChunkCount(sourceId: string, sourceType: string): number {
  const rows = querySql<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM doc_chunks WHERE source_id='${esc(sourceId)}' AND source_type='${sourceType}';`
  );
  return rows[0]?.cnt ?? 0;
}

function deleteOldVectors(sourceId: string, sourceType: string) {
  if (!isProd) return;
  const oldCount = getChunkCount(sourceId, sourceType);
  if (oldCount === 0) return;
  const ids = Array.from({ length: oldCount }, (_, i) => chunkId(sourceType, sourceId, i));
  try {
    execSync(
      `wrangler vectorize delete-vectors ${VECTOR_INDEX} --ids ${ids.join(' ')} --force`,
      { stdio: 'inherit' }
    );
  } catch (e) {
    const msg = `vectorize delete-vectors 失敗（將忽略舊向量）：${(e as Error).message}`;
    console.warn(`  ⚠️  ${msg}`);
    report.recordError(msg);
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

// ── Chunk sync ────────────────────────────────────────────────────────────────

async function syncChunks(
  sourceId: string,
  sourceType: 'post' | 'project',
  content: string,
  meta: { slug: string; title: string; lang: string }
) {
  execSync(
    `wrangler d1 execute ${DB_NAME} ${remoteFlag} --command="DELETE FROM doc_chunks WHERE source_id='${esc(sourceId)}' AND source_type='${sourceType}'" --yes`,
    { stdio: 'inherit' }
  );

  const parts = chunkText(content);
  for (let i = 0; i < parts.length; i++) {
    const cid = chunkId(sourceType, sourceId, i);
    const updated_at = new Date().toISOString().split('T')[0];
    runSql(
      `INSERT INTO doc_chunks (id, source_id, source_type, chunk_index, content, updated_at)
       VALUES ('${esc(cid)}','${esc(sourceId)}','${sourceType}',${i},'${esc(parts[i])}','${updated_at}')
       ON CONFLICT(id) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at`
    );

    if (isProd && ACCOUNT_ID && API_TOKEN) {
      const vector = await getEmbedding(parts[i]);
      if (vector) {
        const tmp = path.join(process.cwd(), `.tmp_vec_${Date.now()}.json`);
        fs.writeFileSync(tmp, JSON.stringify({
          id: cid,
          values: vector,
          metadata: { source_id: sourceId, source_type: sourceType, chunk_index: i, slug: meta.slug, title: meta.title, lang: meta.lang },
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

// ── Orphan cleanup ────────────────────────────────────────────────────────────

async function cleanupOrphans(
  table: 'posts' | 'projects',
  localIds: Set<string>
) {
  const sourceType = table === 'posts' ? 'post' : 'project';
  const rows = querySql<{ id: string }>(`SELECT id FROM ${table};`);
  const d1Ids = new Set(rows.map(r => r.id));

  for (const id of d1Ids) {
    if (localIds.has(id)) continue;
    console.log(`  🗑️  orphan: ${id}`);
    deleteOldVectors(id, sourceType);
    execSync(
      `wrangler d1 execute ${DB_NAME} ${remoteFlag} --command="DELETE FROM doc_chunks WHERE source_id='${esc(id)}' AND source_type='${sourceType}'" --yes`,
      { stdio: 'inherit' }
    );
    execSync(
      `wrangler d1 execute ${DB_NAME} ${remoteFlag} --command="DELETE FROM ${table} WHERE id='${esc(id)}'" --yes`,
      { stdio: 'inherit' }
    );
  }
}

// ── Sync posts ────────────────────────────────────────────────────────────────

async function syncPosts() {
  const files = walkMdFiles(POSTS_DIR);
  const existingHashes = loadExistingHashes('posts');
  const localIds = new Set<string>();
  let skipped = 0;
  let synced = 0;

  console.log(`Found ${files.length} posts.`);

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

    console.log(`  post: ${id}`);
    deleteOldVectors(id, 'post');

    // Remove any stale record that shares the same slug but has a different id
    // (e.g. when a file is renamed). Without this step, the UNIQUE constraint on
    // slug would reject the INSERT even though the id-based ON CONFLICT clause
    // never fires for a brand-new id.
    runSql(`DELETE FROM posts WHERE slug='${esc(slug)}' AND id!='${esc(id)}';`);

    runSql(`
      INSERT INTO posts (id, slug, title, category, lang, description, tldr, content, tags, content_hash, created_at, updated_at)
      VALUES ('${esc(id)}','${esc(slug)}','${esc(title)}','${esc(category)}','${esc(lang)}',
              '${esc(description)}','${esc(tldr)}','${esc(content)}','${esc(tags)}','${hash}',
              '${created_at}','${updated_at}')
      ON CONFLICT(id) DO UPDATE SET
        slug=excluded.slug, title=excluded.title, content=excluded.content,
        description=excluded.description, tldr=excluded.tldr, tags=excluded.tags,
        content_hash=excluded.content_hash, updated_at=excluded.updated_at;
    `);

    await syncChunks(id, 'post', content, { slug, title, lang });
    synced++;
  }

  console.log(`  ✓ ${synced} synced, ${skipped} skipped (unchanged)`);
  await cleanupOrphans('posts', localIds);
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
