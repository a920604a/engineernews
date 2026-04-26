import { useState, useEffect } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type SafeField<T> = { data: T; error: null } | { data: null; error: string };

type D1Data = {
  posts: number;
  doc_chunks: number;
  projects: number;
  page_views: number;
  lang_distribution: { lang: string; count: number }[];
};

type R2Data = { count: number; truncated: boolean };

type VectorizeData = {
  chunk_count: number | null;
  embedding_model: string;
  dimensions: number;
  index_name: string;
};

type ConfigData = {
  embedding_model: string;
  embedding_dims: number;
  chat_model: string;
  vector_top_k: number;
  max_sources: number;
  vectorize_index: string;
  d1_database: string;
  r2_bucket: string;
  compatibility_date: string;
  astro_output: string;
};

type PostRow = {
  id: string;
  title: string;
  category: string;
  lang: string;
  created_at: string;
  updated_at: string;
  chunk_count: number;
};

type StatsResponse = {
  d1: SafeField<D1Data>;
  r2: SafeField<R2Data>;
  vectorize: SafeField<VectorizeData>;
  config: SafeField<ConfigData>;
  posts: SafeField<PostRow[]>;
};

// ── Panel helpers ────────────────────────────────────────────────────────────

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--fill-secondary, rgba(255,255,255,0.06))',
      border: '1px solid var(--separator, rgba(255,255,255,0.1))',
      borderRadius: '12px',
      padding: '20px 24px',
      marginBottom: '16px',
    }}>
      <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--label-secondary)', margin: '0 0 14px' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--separator, rgba(255,255,255,0.06))' }}>
      <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

function ErrorNote({ msg }: { msg: string }) {
  return <p style={{ fontSize: '12px', color: '#ff453a', margin: '8px 0 0' }}>⚠ {msg}</p>;
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      background: color,
      color: '#fff',
      marginRight: '4px',
    }}>
      {text}
    </span>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  tech: '#0a84ff', product: '#30d158', learning: '#ffd60a',
  career: '#bf5af2', life: '#ff9f0a', ai: '#5e5ce6',
  default: '#636366',
};

// ── Panels ───────────────────────────────────────────────────────────────────

function D1Panel({ field }: { field: SafeField<D1Data> }) {
  if (field.error) return <Panel title="D1 Overview"><ErrorNote msg={field.error} /></Panel>;
  const d = field.data!;
  const zhCount = d.lang_distribution.find(l => l.lang === 'zh-TW')?.count ?? 0;
  const enCount = d.lang_distribution.find(l => l.lang === 'en')?.count ?? 0;
  return (
    <Panel title="D1 Overview">
      <StatRow label="posts" value={d.posts} />
      <StatRow label="doc_chunks" value={d.doc_chunks} />
      <StatRow label="projects" value={d.projects} />
      <StatRow label="page_views" value={d.page_views} />
      <StatRow label="lang 分布" value={`zh-TW: ${zhCount} / en: ${enCount}`} />
    </Panel>
  );
}

function VectorizePanel({ field }: { field: SafeField<VectorizeData> }) {
  if (field.error) return <Panel title="Vectorize"><ErrorNote msg={field.error} /></Panel>;
  const d = field.data!;
  return (
    <Panel title="Vectorize">
      <StatRow label="向量數（D1 代理）" value={d.chunk_count ?? '–'} />
      <StatRow label="index" value={d.index_name} />
      <StatRow label="embedding model" value={d.embedding_model} />
      <StatRow label="dimensions" value={d.dimensions} />
    </Panel>
  );
}

function R2Panel({ field }: { field: SafeField<R2Data> }) {
  if (field.error) return <Panel title="R2 OG Images"><ErrorNote msg={field.error} /></Panel>;
  const d = field.data!;
  return (
    <Panel title="R2 OG Images">
      <StatRow label="物件數" value={d.truncated ? '1000+' : d.count} />
      {d.truncated && <p style={{ fontSize: '11px', color: 'var(--label-secondary)', margin: '6px 0 0' }}>超過 1000 筆，顯示截斷值</p>}
    </Panel>
  );
}

function AISearchPanel({ field }: { field: SafeField<ConfigData> }) {
  if (field.error) return <Panel title="AI Search Config"><ErrorNote msg={field.error} /></Panel>;
  const d = field.data!;
  return (
    <Panel title="AI Search Pipeline">
      <StatRow label="embedding model" value={d.embedding_model} />
      <StatRow label="embedding dims" value={d.embedding_dims} />
      <StatRow label="chat model" value={d.chat_model} />
      <StatRow label="vector topK" value={d.vector_top_k} />
      <StatRow label="max sources" value={d.max_sources} />
      <StatRow label="lang filter" value="Vectorize metadata" />
    </Panel>
  );
}

function InfraPanel({ field }: { field: SafeField<ConfigData> }) {
  if (field.error) return <Panel title="Infra Config"><ErrorNote msg={field.error} /></Panel>;
  const d = field.data!;
  return (
    <Panel title="Infra Config">
      <StatRow label="D1 database" value={d.d1_database} />
      <StatRow label="R2 bucket" value={d.r2_bucket} />
      <StatRow label="Vectorize index" value={d.vectorize_index} />
      <StatRow label="compatibility_date" value={d.compatibility_date} />
      <StatRow label="Astro output" value={d.astro_output} />
    </Panel>
  );
}

function PostTimelinePanel({ field }: { field: SafeField<PostRow[]> }) {
  if (field.error) return <Panel title="Post Timeline"><ErrorNote msg={field.error} /></Panel>;
  const posts = field.data!;
  return (
    <Panel title={`Post Timeline (${posts.length})`}>
      <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
        {posts.map(post => (
          <div key={post.id} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 0',
            borderBottom: '1px solid var(--separator, rgba(255,255,255,0.06))',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--label-secondary)', whiteSpace: 'nowrap', minWidth: '80px' }}>
              {post.created_at.slice(0, 10)}
            </span>
            <Badge
              text={post.category}
              color={CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.default}
            />
            <Badge text={post.lang} color="#48484a" />
            <span style={{ fontSize: '13px', flex: 1, minWidth: '120px' }}>{post.title}</span>
            {post.chunk_count === 0 && (
              <span style={{ fontSize: '11px', color: '#ff9f0a', whiteSpace: 'nowrap' }}>⚠ 未向量化</span>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Auth form ────────────────────────────────────────────────────────────────

function AuthForm({ onSubmit }: { onSubmit: (token: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div style={{ maxWidth: '360px', margin: '80px auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>Admin Dashboard</h1>
      <p style={{ fontSize: '14px', color: 'var(--label-secondary)', marginBottom: '24px' }}>Enter your admin token to continue.</p>
      <form onSubmit={e => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()); }} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Admin token"
          autoFocus
          style={{
            flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '14px',
            border: '1px solid var(--separator)', background: 'var(--fill-secondary)',
            color: 'inherit', outline: 'none',
          }}
        />
        <button type="submit" style={{
          padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 700,
          background: '#0a84ff', color: '#fff', border: 'none', cursor: 'pointer',
        }}>
          Enter
        </button>
      </form>
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ opacity: 0.4 }}>
      {[200, 160, 120, 180, 220].map((w, i) => (
        <div key={i} style={{
          height: '14px', width: `${w}px`, borderRadius: '4px',
          background: 'var(--label-secondary)', marginBottom: '12px',
        }} />
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'admin_token';

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  // Fetch stats when token is available
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/stats?token=${encodeURIComponent(token)}`)
      .then(async res => {
        if (res.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          throw new Error('Unauthorized — token cleared');
        }
        return res.json() as Promise<StatsResponse>;
      })
      .then(data => {
        localStorage.setItem(TOKEN_KEY, token);
        setStats(data);
      })
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) return <AuthForm onSubmit={setToken} />;

  return (
    <div style={{ paddingTop: '32px', paddingBottom: '64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0 }}>Admin Dashboard</h1>
          <p style={{ fontSize: '13px', color: 'var(--label-secondary)', margin: '4px 0 0' }}>
            engineer-news · Cloudflare infra overview
          </p>
        </div>
        <button
          onClick={() => { localStorage.removeItem(TOKEN_KEY); setToken(null); setStats(null); }}
          style={{ fontSize: '13px', color: 'var(--label-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Sign out
        </button>
      </div>

      {loading && <Skeleton />}

      {error && !loading && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: '#ff453a', fontSize: '14px' }}>Error: {error}</p>
          <button
            onClick={() => setToken(t => t ? t + '' : t)}
            style={{ fontSize: '13px', color: '#0a84ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Retry
          </button>
        </div>
      )}

      {stats && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0 16px' }}>
          <div>
            <D1Panel field={stats.d1} />
            <VectorizePanel field={stats.vectorize} />
            <R2Panel field={stats.r2} />
          </div>
          <div>
            <AISearchPanel field={stats.config} />
            <InfraPanel field={stats.config} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <PostTimelinePanel field={stats.posts} />
          </div>
        </div>
      )}
    </div>
  );
}
