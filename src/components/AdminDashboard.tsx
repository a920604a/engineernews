import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugToUrl(slug: string): string {
  if (slug.endsWith('.en')) return `/en/posts/${slug.slice(0, -3)}`;
  return `/posts/${slug}`;
}

function twTime(utcStr: string): string {
  return new Date(utcStr.replace(' ', 'T') + 'Z')
    .toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
}

function twDate(utcStr: string): string {
  return new Date(utcStr.replace(' ', 'T') + 'Z')
    .toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ── Types ────────────────────────────────────────────────────────────────────

type SF<T> = { data: T; error: null } | { data: null; error: string };

type D1Data = {
  posts: number; doc_chunks: number; projects: number; page_views: number; search_logs: number;
  lang_distribution: { lang: string; count: number }[];
  category_distribution: { category: string; count: number }[];
  recent_posts: { id: string; title: string; category: string; lang: string; created_at: string }[];
  posts_trend: { date: string; count: number }[];
  search_trend: { hour: string; total: number; ok: number; avg_ms: number }[];
  search_stats: { total: number; llm_ok: number; vec_ok: number; avg_ms: number; errors: number };
  page_views_top: { slug: string; count: number }[];
};
type R2Data = { count: number; truncated: boolean };
type VecCoverage = { total_posts: number; covered: number; uncovered: number; uncovered_posts: { id: string; title: string; lang: string }[] };
type VecData = { chunk_count: number | null; vector_count?: number | null; drift?: number | null; processed_up_to?: string | null; coverage?: VecCoverage; embedding_model: string; dimensions: number; index_name: string; metadata_indexes: string[] };
type CfgData = { embedding_model: string; embedding_dims: number; chat_model: string; vector_top_k: number; max_sources: number; vectorize_index: string; d1_database: string; r2_bucket: string; compatibility_date: string; astro_output: string };
type PostRow = { id: string; title: string; category: string; lang: string; created_at: string; updated_at: string; chunk_count: number };
type ContentStats = { draft_true: number; draft_false: number; published_with_audio: number };
type Overview = { d1: SF<D1Data>; r2: SF<R2Data>; vectorize: SF<VecData>; config: SF<CfgData>; posts: SF<PostRow[]>; content_stats: SF<ContentStats> };
type AppLogRow = { id: number; level: 'debug' | 'info' | 'warn' | 'error'; source: string; message: string; data: string | null; created_at: string };
type AppLogPage = { rows: AppLogRow[]; total: number; limit: number; offset: number };
type SearchLog = { id: number; query: string; lang: string; vector_hits: number; keyword_hits: number; llm_ok: number; error: string | null; duration_ms: number; created_at: string };
type TraceRow = { id: number; query: string; lang: string; vector_hits: number; keyword_hits: number; llm_ok: number; duration_ms: number; llm_answer: string | null; sources_json: string | null; quality_score: number; created_at: string };
type TracePage = { rows: TraceRow[]; total: number; limit: number; offset: number };
type ChunkRow = { source_id: string; title: string; category: string; lang: string; chunk_count: number; last_updated: string };
type R2Object = { key: string; size: number; uploaded: string };
type PageView = { slug: string; count: number; updated_at: string; title?: string | null; r_heart: number; r_thumb: number; r_idea: number; r_fire: number; r_total: number };
type TTSRecord = { id: number; created_at: string; type: 'tts'; title: string; voice: string; audio_filename: string; srt_filename: string };

type CommentRow = { id: number; post_slug: string; author_name: string; body: string; hidden: number; created_at: string };
type CommentsData = { rows: CommentRow[]; total: number };

type MainTab = 'overview' | 'content' | 'search' | 'infra' | 'system' | 'moderation';

const TOKEN_KEY = 'admin_token';
const SESSION_TTL = 36 * 60 * 60 * 1000; // 36 hours

function saveSession(token: string) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, loginAt: Date.now() }));
}

function loadSession(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'string') { localStorage.removeItem(TOKEN_KEY); return null; }
    const { token, loginAt } = parsed as { token: string; loginAt: number };
    if (Date.now() - loginAt > SESSION_TTL) { localStorage.removeItem(TOKEN_KEY); return null; }
    return token;
  } catch { return null; }
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const TTL: Record<string, number> = {
  overview: 5 * 60_000,
  logs: 60_000,
  'search-logs': 2 * 60_000,
  'page-views': 10 * 60_000,
  'chunks-by-post': 10 * 60_000,
  'r2-objects': 10 * 60_000,
  'log-sources': 2 * 60_000,
};

function cacheGet<T>(key: string): { data: T; fetchedAt: number } | null {
  try {
    const raw = localStorage.getItem(`adm_${key}`);
    if (!raw) return null;
    const { data, fetchedAt, ttl } = JSON.parse(raw) as { data: T; fetchedAt: number; ttl: number };
    if (Date.now() - fetchedAt > ttl) return null;
    return { data, fetchedAt };
  } catch { return null; }
}

function cacheSet<T>(key: string, data: T) {
  try {
    localStorage.setItem(`adm_${key}`, JSON.stringify({ data, fetchedAt: Date.now(), ttl: TTL[key] ?? 5 * 60_000 }));
  } catch {}
}

function timeAgo(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ── Theme ─────────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  tech: '#0a84ff', product: '#30d158', learning: '#ffd60a',
  career: '#bf5af2', life: '#ff9f0a', ai: '#5e5ce6', default: '#636366',
};
const CHART_PALETTE = ['#0a84ff', '#30d158', '#ffd60a', '#ff9f0a', '#bf5af2', '#5e5ce6', '#ff453a', '#64d2ff'];
const LOG_COLORS = { debug: '#636366', info: '#30d158', warn: '#ffd60a', error: '#ff453a' } as const;

function catColor(c: string) { return CAT_COLORS[c] ?? CAT_COLORS.default; }
function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
function pct(a: number, b: number) { return b ? Math.round((a / b) * 100) : 0; }

const CHART_STYLE = {
  grid: <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />,
  tooltip: {
    contentStyle: { background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '12px' },
    labelStyle: { color: 'rgba(255,255,255,0.5)', fontSize: '11px' },
    itemStyle: { color: '#fff' },
  } as React.ComponentProps<typeof Tooltip>,
  xAxis: { tick: { fill: 'rgba(255,255,255,0.4)', fontSize: 11 }, axisLine: false, tickLine: false },
  yAxis: { tick: { fill: 'rgba(255,255,255,0.4)', fontSize: 11 }, axisLine: false, tickLine: false, width: 32 },
};

// ── Style primitives ──────────────────────────────────────────────────────────

const s = {
  card: { background: 'var(--fill-secondary,rgba(255,255,255,0.06))', border: '1px solid var(--separator,rgba(255,255,255,0.1))', borderRadius: '12px', padding: '20px' } as React.CSSProperties,
  label: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--label-secondary)', margin: '0 0 4px' },
  value: { fontSize: '28px', fontWeight: 900, margin: 0, lineHeight: 1.1 },
  mono: { fontFamily: 'monospace', fontSize: '12px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--separator,rgba(255,255,255,0.06))' } as React.CSSProperties,
  pill: (color: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: color, color: '#fff', marginRight: '4px' } as React.CSSProperties),
  section: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--label-secondary)', margin: '20px 0 10px' },
  err: { fontSize: '12px', color: '#ff453a', margin: '8px 0 0' },
  btn: (active?: boolean) => ({
    padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', border: 'none',
    background: active ? '#0a84ff' : 'var(--fill-secondary,rgba(255,255,255,0.06))',
    color: active ? '#fff' : 'inherit',
  } as React.CSSProperties),
};

// ── Primitive UI ──────────────────────────────────────────────────────────────

function Stat({ label, value, sub, color, onClick }: { label: string; value: React.ReactNode; sub?: React.ReactNode; color?: string; onClick?: () => void }) {
  return (
    <div style={{ ...s.card, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <p style={s.label}>{label}</p>
      <p style={{ ...s.value, color: color ?? 'inherit' }}>{value}</p>
      {sub && <p style={{ fontSize: '12px', color: 'var(--label-secondary)', margin: '4px 0 0' }}>{sub}</p>}
      {onClick && <p style={{ fontSize: '11px', color: '#0a84ff', margin: '6px 0 0' }}>詳細 →</p>}
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={s.row}>
      <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>{k}</span>
      <span style={{ ...s.mono, fontWeight: 600 }}>{v}</span>
    </div>
  );
}

function Err({ msg }: { msg: string }) { return <p style={s.err}>⚠ {msg}</p>; }

function Skeleton({ h = 14, w = '100%' }: { h?: number; w?: string | number }) {
  return <div style={{ height: h, width: w, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginBottom: 6 }} />;
}

function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return <div>{Array.from({ length: lines }, (_, i) => <Skeleton key={i} w={`${60 + (i % 3) * 15}%`} />)}</div>;
}

function FetchedAt({ ts }: { ts: number }) {
  return <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginLeft: '8px' }}>{timeAgo(Date.now() - ts)}</span>;
}

function RateBar({ value, color = '#0a84ff' }: { value: number; color?: string }) {
  return (
    <div style={{ marginTop: '8px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
    </div>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function AuthForm({ onSubmit }: { onSubmit: (t: string) => void }) {
  const [v, setV] = useState('');
  return (
    <div style={{ maxWidth: '380px', margin: '100px auto', textAlign: 'center' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛠</div>
      <h1 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 6px' }}>Engineer News Admin</h1>
      <p style={{ fontSize: '14px', color: 'var(--label-secondary)', margin: '0 0 28px' }}>請輸入 admin token 以繼續</p>
      <form onSubmit={e => { e.preventDefault(); if (v.trim()) onSubmit(v.trim()); }} style={{ display: 'flex', gap: '8px' }}>
        <input type="password" value={v} onChange={e => setV(e.target.value)} placeholder="ADMIN_TOKEN" autoFocus
          style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--separator)', background: 'var(--fill-secondary)', color: 'inherit', outline: 'none' }} />
        <button type="submit" style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, background: '#0a84ff', color: '#fff', border: 'none', cursor: 'pointer' }}>Enter</button>
      </form>
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────────────────────────

function CategoryPieChart({ data, total }: { data: { category: string; count: number }[]; total: number }) {
  const pieData = data.map(d => ({ name: d.category, value: d.count }));
  return (
    <div>
      <p style={s.section}>Content by Category</p>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={72} paddingAngle={2} dataKey="value" strokeWidth={0}>
              {pieData.map((entry, i) => <Cell key={entry.name} fill={catColor(entry.name)} />)}
            </Pie>
            <Tooltip {...CHART_STYLE.tooltip} formatter={(v: number) => [`${v} (${pct(v, total)}%)`, '']} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1 }}>
          {data.slice(0, 6).map(d => (
            <div key={d.category} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: catColor(d.category), flexShrink: 0 }} />
              <span style={{ fontSize: '12px', flex: 1, color: 'var(--label-secondary)' }}>{d.category}</span>
              <span style={{ fontSize: '12px', fontWeight: 700 }}>{d.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LangDonutChart({ data }: { data: { lang: string; count: number }[] }) {
  const LANG_COLORS: Record<string, string> = { 'zh-TW': '#0a84ff', en: '#30d158' };
  return (
    <div>
      <p style={s.section}>Language Distribution</p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="count" nameKey="lang" strokeWidth={0} label={({ lang, percent }) => `${lang} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
            {data.map(d => <Cell key={d.lang} fill={LANG_COLORS[d.lang] ?? CHART_PALETTE[2]} />)}
          </Pie>
          <Tooltip {...CHART_STYLE.tooltip} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function PostsTrendChart({ data }: { data: { date: string; count: number }[] }) {
  const formatted = data.map(d => ({ ...d, date: d.date.slice(5) })); // MM-DD
  return (
    <div>
      <p style={s.section}>Posts Published (30 days)</p>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={formatted} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="postGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0a84ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0a84ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          {CHART_STYLE.grid}
          <XAxis dataKey="date" {...CHART_STYLE.xAxis} interval="preserveStartEnd" />
          <YAxis {...CHART_STYLE.yAxis} allowDecimals={false} />
          <Tooltip {...CHART_STYLE.tooltip} />
          <Area type="monotone" dataKey="count" stroke="#0a84ff" strokeWidth={2} fill="url(#postGrad)" dot={false} name="Posts" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SearchTrendChart({ data }: { data: { hour: string; total: number; ok: number; avg_ms: number }[] }) {
  return (
    <div>
      <p style={s.section}>AI Search (last 24h)</p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="20%">
          {CHART_STYLE.grid}
          <XAxis dataKey="hour" {...CHART_STYLE.xAxis} />
          <YAxis {...CHART_STYLE.yAxis} allowDecimals={false} />
          <Tooltip {...CHART_STYLE.tooltip} />
          <Bar dataKey="ok" name="LLM OK" fill="#30d158" stackId="a" radius={[0, 0, 0, 0]} />
          <Bar dataKey="total" name="Total" fill="rgba(255,255,255,0.12)" stackId="b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PageViewsChart({ data }: { data: { slug: string; count: number }[] }) {
  const formatted = data.map(d => ({ ...d, slug: d.slug.length > 28 ? d.slug.slice(0, 26) + '…' : d.slug }));
  return (
    <div>
      <p style={s.section}>Top Pages</p>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 28)}>
        <BarChart data={formatted} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          {CHART_STYLE.grid}
          <XAxis type="number" {...CHART_STYLE.xAxis} />
          <YAxis type="category" dataKey="slug" {...CHART_STYLE.yAxis} width={140} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
          <Tooltip {...CHART_STYLE.tooltip} />
          <Bar dataKey="count" fill="#5e5ce6" radius={[0, 4, 4, 0]} name="Views" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SearchStatsGauges({ stats }: { stats: D1Data['search_stats'] }) {
  const llmPct   = pct(stats.llm_ok ?? 0, stats.total);
  const vecPct   = pct(stats.vec_ok ?? 0, stats.total);
  const errColor = (stats.errors ?? 0) > 0 ? '#ff453a' : '#30d158';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
      <div style={s.card}>
        <p style={s.label}>LLM 成功率 (7d)</p>
        <p style={{ ...s.value, fontSize: '24px', color: llmPct >= 80 ? '#30d158' : llmPct >= 50 ? '#ffd60a' : '#ff453a' }}>{llmPct}%</p>
        <RateBar value={llmPct} color={llmPct >= 80 ? '#30d158' : '#ffd60a'} />
      </div>
      <div style={s.card}>
        <p style={s.label}>向量命中率 (7d)</p>
        <p style={{ ...s.value, fontSize: '24px', color: vecPct >= 70 ? '#30d158' : '#ffd60a' }}>{vecPct}%</p>
        <RateBar value={vecPct} color="#0a84ff" />
      </div>
      <div style={s.card}>
        <p style={s.label}>平均耗時 (7d)</p>
        <p style={{ ...s.value, fontSize: '24px' }}>{stats.avg_ms ?? 0}<span style={{ fontSize: '13px' }}> ms</span></p>
      </div>
      <div style={s.card}>
        <p style={s.label}>錯誤次數 (7d)</p>
        <p style={{ ...s.value, fontSize: '24px', color: errColor }}>{stats.errors ?? 0}</p>
      </div>
    </div>
  );
}

// ── Detail views ──────────────────────────────────────────────────────────────

function PostsDetail({ posts }: { posts: PostRow[] }) {
  const [filter, setFilter] = useState('');
  const [lang, setLang] = useState('all');
  const filtered = posts.filter(p =>
    (lang === 'all' || p.lang === lang) &&
    (!filter || p.title.toLowerCase().includes(filter.toLowerCase()) || p.category.includes(filter))
  );
  const unvec = posts.filter(p => p.chunk_count === 0).length;
  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="搜尋標題 / 分類…"
          style={{ flex: 1, minWidth: '180px', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--separator)', background: 'var(--fill-secondary)', color: 'inherit', outline: 'none' }} />
        {['all', 'zh-TW', 'en'].map(l => (
          <button key={l} style={s.btn(lang === l)} onClick={() => setLang(l)}>{l}</button>
        ))}
        <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>{filtered.length} 篇</span>
        {unvec > 0 && <span style={{ fontSize: '12px', color: '#ff9f0a' }}>⚠ {unvec} 篇未向量化</span>}
      </div>
      <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
        {filtered.map(post => (
          <div key={post.id} style={{ ...s.row, gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ ...s.mono, color: 'var(--label-secondary)', minWidth: '82px' }}>{post.created_at.slice(0, 10)}</span>
            <span style={s.pill(catColor(post.category))}>{post.category}</span>
            <span style={s.pill('#48484a')}>{post.lang}</span>
            <span style={{ fontSize: '13px', flex: 1, minWidth: '140px' }}>{post.title}</span>
            <span style={{ ...s.mono, color: post.chunk_count === 0 ? '#ff9f0a' : 'var(--label-secondary)' }}>{post.chunk_count} chunks</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VectorizeDetail({ vec, token }: { vec: VecData; token: string }) {
  const [chunks, setChunks] = useState<ChunkRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = cacheGet<ChunkRow[]>('chunks-by-post');
    if (cached) { setChunks(cached.data); return; }
    setLoading(true);
    fetch(`/api/admin/stats?token=${encodeURIComponent(token)}&view=chunks-by-post`)
      .then(r => r.json() as Promise<SF<ChunkRow[]>>)
      .then(d => { if (d.data) { cacheSet('chunks-by-post', d.data); setChunks(d.data); } else setErr(d.error); })
      .catch(e => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={s.card}><p style={s.label}>Index</p><p style={{ ...s.mono, margin: '4px 0 0', fontWeight: 700, fontSize: '11px' }}>{vec.index_name}</p></div>
        <div style={s.card}><p style={s.label}>Model</p><p style={{ ...s.mono, margin: '4px 0 0', fontWeight: 700, fontSize: '11px' }}>{vec.embedding_model.split('/').at(-1)}</p></div>
        <div style={s.card}><p style={s.label}>Dimensions</p><p style={{ ...s.value, fontSize: '22px' }}>{vec.dimensions}</p></div>
        <div style={s.card}><p style={s.label}>D1 Chunks</p><p style={{ ...s.value, fontSize: '22px' }}>{vec.chunk_count ?? '–'}</p></div>
        <div style={s.card}><p style={s.label}>Vectorize Vectors</p><p style={{ ...s.value, fontSize: '22px' }}>{vec.vector_count ?? '–'}</p></div>
      </div>

      {/* Drift: Vectorize vs D1. 0 = in sync; >0 = orphan vectors; <0 = missing vectors */}
      {typeof vec.drift === 'number' && (
        <div style={{ ...s.card, marginBottom: '16px', borderColor: vec.drift === 0 ? 'var(--separator)' : '#ff9f0a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: vec.drift === 0 ? 'var(--color-green)' : '#ff9f0a' }}>
            {vec.drift === 0 ? '✓ In sync' : `⚠ Drift ${vec.drift > 0 ? '+' : ''}${vec.drift}`}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>
            {vec.drift === 0
              ? 'Vectorize 向量數 = D1 chunk 數，索引一致。'
              : vec.drift > 0
                ? `Vectorize 比 D1 多 ${vec.drift} 個向量（可能有孤兒向量，下次 sync 的 cleanupOrphans 會清）。`
                : `Vectorize 比 D1 少 ${-vec.drift} 個向量（有 chunk 還沒進索引，需重跑 sync）。`}
          </span>
        </div>
      )}

      {/* Coverage: how many posts have chunks at all */}
      {vec.coverage && (
        <div style={{ marginBottom: '24px' }}>
          <p style={s.section}>Post Coverage</p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginBottom: vec.coverage.uncovered > 0 ? '10px' : 0 }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: vec.coverage.uncovered === 0 ? 'var(--color-green)' : '#ff9f0a' }}>
              {vec.coverage.covered}/{vec.coverage.total_posts} posts covered
            </span>
            <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>
              {vec.coverage.uncovered === 0 ? '✓ 每篇文章都有向量' : `${vec.coverage.uncovered} 篇沒有任何 chunk（未進 Vectorize）`}
            </span>
          </div>
          {vec.coverage.uncovered > 0 && (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {vec.coverage.uncovered_posts.map(p => (
                <div key={p.id} style={{ ...s.row, gap: '8px' }}>
                  <span style={s.pill('#48484a')}>{p.lang}</span>
                  <span style={{ fontSize: '13px', flex: 1 }}>{p.title}</span>
                  <span style={{ ...s.mono, color: '#ff9f0a', fontSize: '11px' }}>0 chunks</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p style={s.section}>Chunks per Post</p>
      {loading && <CardSkeleton lines={6} />}
      {err && <Err msg={err} />}
      {chunks && (
        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          {chunks.map(c => (
            <div key={c.source_id} style={{ ...s.row, gap: '8px', flexWrap: 'wrap' }}>
              <span style={s.pill(catColor(c.category))}>{c.category}</span>
              <span style={s.pill('#48484a')}>{c.lang}</span>
              <span style={{ fontSize: '13px', flex: 1 }}>{c.title}</span>
              <span style={{ ...s.mono, color: 'var(--label-secondary)', fontSize: '11px' }}>{twDate(c.last_updated)} {twTime(c.last_updated)}</span>
              <span style={{ ...s.mono, color: 'var(--label-secondary)' }}>{c.chunk_count} chunks</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function R2Detail({ token }: { token: string }) {
  const [objects, setObjects] = useState<R2Object[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const cached = cacheGet<R2Object[]>('r2-objects');
    if (cached) { setObjects(cached.data); return; }
    setLoading(true);
    fetch(`/api/admin/stats?token=${encodeURIComponent(token)}&view=r2-objects`)
      .then(r => r.json() as Promise<SF<R2Object[]>>)
      .then(d => { if (d.data) { cacheSet('r2-objects', d.data); setObjects(d.data); } else setErr(d.error); })
      .catch(e => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = (objects ?? []).filter(o => !filter || o.key.includes(filter));
  const totalSize = (objects ?? []).reduce((acc, o) => acc + o.size, 0);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={s.card}><p style={s.label}>Bucket</p><p style={{ ...s.mono, margin: '4px 0 0', fontWeight: 700, fontSize: '11px' }}>og-images</p></div>
        <div style={s.card}><p style={s.label}>Objects</p><p style={{ ...s.value, fontSize: '22px' }}>{objects?.length ?? '…'}</p></div>
        <div style={s.card}><p style={s.label}>Total Size</p><p style={{ ...s.value, fontSize: '22px' }}>{objects ? fmtBytes(totalSize) : '…'}</p></div>
      </div>
      {loading && <CardSkeleton lines={8} />}
      {err && <Err msg={err} />}
      {objects && (
        <>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter key…"
            style={{ width: '100%', marginBottom: '12px', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--separator)', background: 'var(--fill-secondary)', color: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ maxHeight: '460px', overflowY: 'auto' }}>
            {filtered.map(obj => (
              <div key={obj.key} style={{ ...s.row, gap: '12px' }}>
                <span style={{ ...s.mono, flex: 1, fontSize: '12px', wordBreak: 'break-all' }}>{obj.key}</span>
                <span style={{ ...s.mono, color: 'var(--label-secondary)', whiteSpace: 'nowrap' }}>{fmtBytes(obj.size)}</span>
                <span style={{ ...s.mono, color: 'var(--label-secondary)', fontSize: '11px', whiteSpace: 'nowrap' }}>{obj.uploaded.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SearchTracesDetail({ token }: { token: string }) {
  const [rows, setRows] = useState<TraceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [quality, setQuality] = useState<Record<number, number>>({});

  const fetchTraces = useCallback((q = '') => {
    setLoading(true);
    const qs = q ? `&q=${encodeURIComponent(q)}` : '';
    fetch(`/api/admin/search-traces?token=${encodeURIComponent(token)}${qs}`)
      .then(r => r.json() as Promise<TracePage>)
      .then(d => { setRows(d.rows); setTotal(d.total); })
      .catch(e => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchTraces(); }, [fetchTraces]);

  const handleFilter = (v: string) => {
    setFilter(v);
    fetchTraces(v);
  };

  const setScore = async (id: number, score: number) => {
    const current = quality[id] ?? rows.find(r => r.id === id)?.quality_score ?? -1;
    const next = current === score ? -1 : score;
    setQuality(prev => ({ ...prev, [id]: next }));
    await fetch(`/api/admin/search-traces?token=${encodeURIComponent(token)}&id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality_score: next }),
    });
  };

  const qualityIcon = (row: TraceRow) => {
    const score = quality[row.id] ?? row.quality_score;
    if (score === 1) return '✓';
    if (score === 0) return '✗';
    return '–';
  };

  const qualityColor = (row: TraceRow) => {
    const score = quality[row.id] ?? row.quality_score;
    if (score === 1) return '#30d158';
    if (score === 0) return '#ff453a';
    return 'var(--label-tertiary)';
  };

  if (err) return <Err msg={err} />;

  const displayRows = filter
    ? rows.filter(r => r.query.toLowerCase().includes(filter.toLowerCase()))
    : rows;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
        <input
          value={filter}
          onChange={e => handleFilter(e.target.value)}
          placeholder="過濾查詢關鍵字..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '0.5px solid var(--separator)', background: 'var(--bg-tertiary)', color: 'var(--label)', fontSize: '14px', outline: 'none' }}
        />
        <span style={{ fontSize: '13px', color: 'var(--label-secondary)', whiteSpace: 'nowrap' }}>
          {loading ? '載入中…' : `共 ${total} 筆`}
        </span>
      </div>

      <div style={{ maxHeight: '620px', overflowY: 'auto' }}>
        {displayRows.map(row => (
          <Fragment key={row.id}>
            <div
              onClick={() => setExpanded(expanded === row.id ? null : row.id)}
              style={{ display: 'grid', gridTemplateColumns: '100px 1fr 50px 70px 40px', gap: '0 8px', padding: '8px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '11px', color: 'var(--label-secondary)', fontFamily: 'monospace' }}>{row.created_at.slice(0, 16).replace('T', ' ')}</span>
              <div>
                <span style={{ fontSize: '13px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.query}</span>
                <span style={{ fontSize: '11px', color: 'var(--label-tertiary)' }}>{row.duration_ms}ms · {row.lang === 'zh-TW' ? '中文' : 'EN'} · vec:{row.vector_hits}</span>
              </div>
              <span style={{ fontSize: '13px', color: qualityColor(row), textAlign: 'center' }}>{qualityIcon(row)}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={e => { e.stopPropagation(); setScore(row.id, 1); }} style={{ padding: '2px 6px', borderRadius: '5px', border: '0.5px solid var(--separator)', background: (quality[row.id] ?? row.quality_score) === 1 ? '#30d158' : 'transparent', color: (quality[row.id] ?? row.quality_score) === 1 ? '#fff' : '#30d158', cursor: 'pointer', fontSize: '12px' }}>✓</button>
                <button onClick={e => { e.stopPropagation(); setScore(row.id, 0); }} style={{ padding: '2px 6px', borderRadius: '5px', border: '0.5px solid var(--separator)', background: (quality[row.id] ?? row.quality_score) === 0 ? '#ff453a' : 'transparent', color: (quality[row.id] ?? row.quality_score) === 0 ? '#fff' : '#ff453a', cursor: 'pointer', fontSize: '12px' }}>✗</button>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--label-tertiary)', textAlign: 'right' }}>{row.llm_answer ? '▾' : ''}</span>
            </div>

            {expanded === row.id && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--separator)', fontSize: '14px', lineHeight: 1.7 }}>
                {row.llm_answer ? (
                  <>
                    <div className="chat-md" style={{ marginBottom: '12px' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.llm_answer}</ReactMarkdown>
                    </div>
                    {row.sources_json && (() => {
                      try {
                        const srcs = JSON.parse(row.sources_json) as { title: string; url: string; citation: number; score: number }[];
                        return (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '0.5px solid var(--separator)', paddingTop: '8px' }}>
                            {srcs.map(s => (
                              <a key={s.citation} href={s.url} style={{ fontSize: '11px', padding: '2px 7px', background: 'var(--glass)', border: '0.5px solid var(--separator)', borderRadius: '20px', color: 'var(--accent)', textDecoration: 'none' }}>
                                [{s.citation}] {s.title}
                              </a>
                            ))}
                          </div>
                        );
                      } catch { return null; }
                    })()}
                  </>
                ) : (
                  <span style={{ color: 'var(--label-tertiary)' }}>無 trace 資料（舊記錄或查詢失敗）</span>
                )}
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function SearchLogsDetail({ token }: { token: string }) {
  const [rows, setRows] = useState<SearchLog[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = cacheGet<SearchLog[]>('search-logs');
    if (cached) { setRows(cached.data); return; }
    setLoading(true);
    fetch(`/api/admin/stats?token=${encodeURIComponent(token)}&view=search-logs`)
      .then(r => r.json() as Promise<SF<SearchLog[]>>)
      .then(d => { if (d.data) { cacheSet('search-logs', d.data); setRows(d.data); } else setErr(d.error); })
      .catch(e => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <CardSkeleton lines={10} />;
  if (err) return <Err msg={err} />;
  if (!rows) return null;

  const total = rows.length;
  const llmOk = rows.filter(r => r.llm_ok).length;
  const withError = rows.filter(r => r.error).length;
  const avgMs = rows.length ? Math.round(rows.reduce((acc, r) => acc + (r.duration_ms ?? 0), 0) / rows.length) : 0;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={s.card}><p style={s.label}>Queries</p><p style={s.value}>{total}</p></div>
        <div style={s.card}><p style={s.label}>LLM OK</p><p style={{ ...s.value, color: '#30d158' }}>{llmOk}</p></div>
        <div style={s.card}><p style={s.label}>Vec Hit %</p><p style={s.value}>{total ? pct(rows.filter(r => r.vector_hits > 0).length, total) : 0}%</p></div>
        <div style={s.card}><p style={s.label}>Avg ms</p><p style={s.value}>{avgMs}</p></div>
        <div style={s.card}><p style={s.label}>Errors</p><p style={{ ...s.value, color: withError ? '#ff453a' : 'inherit' }}>{withError}</p></div>
      </div>
      <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 48px 80px 80px 80px 60px', gap: '0 8px', padding: '4px 0', borderBottom: '1px solid var(--separator)', marginBottom: '4px' }}>
          {['Time', 'Query', 'Lang', 'Vec', 'KW', 'ms', 'LLM'].map(h => (
            <span key={h} style={{ ...s.label, margin: 0 }}>{h}</span>
          ))}
        </div>
        {rows.map(r => (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 48px 80px 80px 80px 60px', gap: '0 8px', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
            <span style={{ ...s.mono, fontSize: '11px', color: 'var(--label-secondary)' }}>{r.created_at.slice(11, 19)}</span>
            <div style={{ overflow: 'hidden' }}>
              <span style={{ fontSize: '13px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.query}</span>
              {r.error && <span style={{ fontSize: '11px', color: '#ff453a' }}>⚠ {r.error.slice(0, 60)}</span>}
            </div>
            <span style={{ ...s.mono, fontSize: '12px' }}>{r.lang === 'zh-TW' ? '中' : 'EN'}</span>
            <span style={{ ...s.mono, fontSize: '12px', color: r.vector_hits > 0 ? '#30d158' : '#ff9f0a' }}>{r.vector_hits}</span>
            <span style={{ ...s.mono, fontSize: '12px', color: 'var(--label-secondary)' }}>{r.keyword_hits}</span>
            <span style={{ ...s.mono, fontSize: '12px' }}>{r.duration_ms ?? '–'}</span>
            <span style={{ fontSize: '12px', color: r.llm_ok ? '#30d158' : '#ff453a' }}>{r.llm_ok ? '✓' : '✗'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PageViewsDetail({ token }: { token: string }) {
  const [rows, setRows] = useState<PageView[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = cacheGet<PageView[]>('page-views');
    if (cached) { setRows(cached.data); return; }
    setLoading(true);
    fetch(`/api/admin/stats?token=${encodeURIComponent(token)}&view=page-views`)
      .then(r => r.json() as Promise<SF<PageView[]>>)
      .then(d => { if (d.data) { cacheSet('page-views', d.data); setRows(d.data); } else setErr(d.error); })
      .catch(e => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [token]);

  const max = rows ? Math.max(...rows.map(r => r.count), 1) : 1;

  return (
    <div>
      {loading && <CardSkeleton lines={10} />}
      {err && <Err msg={err} />}
      {rows && (
        <p style={{ fontSize: '11px', color: 'var(--label-tertiary)', margin: '0 0 10px' }}>
          有 reaction 的文章排在最前 · ❤️ 喜歡 / 👍 讚 / 💡 啟發 / 🔥 精彩
        </p>
      )}
      {rows && rows.map(r => {
        const reactions: [string, number][] = [['❤️', r.r_heart], ['👍', r.r_thumb], ['💡', r.r_idea], ['🔥', r.r_fire]];
        return (
          <div key={r.slug} style={{ ...s.row, gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href={slugToUrl(r.slug)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: '160px', fontSize: '13px', color: '#0a84ff', textDecoration: 'none' }}>
              {r.title || r.slug}
            </a>
            <div style={{ display: 'flex', gap: '7px', minWidth: '130px', alignItems: 'center' }}>
              {r.r_total > 0
                ? reactions.filter(([, n]) => n > 0).map(([e, n]) => (
                    <span key={e} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--label)', whiteSpace: 'nowrap' }}>{e} {n}</span>
                  ))
                : <span style={{ fontSize: '11px', color: 'var(--label-tertiary)' }}>無 reaction</span>}
            </div>
            <div style={{ width: '90px', height: '5px', borderRadius: '3px', background: 'var(--separator)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(r.count / max) * 100}%`, background: '#5e5ce6', borderRadius: '3px' }} />
            </div>
            <span style={{ ...s.mono, fontWeight: 700, minWidth: '36px', textAlign: 'right' }} title="page views">{r.count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Logs Detail / Card ────────────────────────────────────────────────────────

const LOG_LEVEL_LABELS = ['debug', 'info', 'warn', 'error'] as const;
const LOG_PAGE_SIZE = 50;

function LogsPanel({ token }: { token: string }) {
  const [rows, setRows] = useState<AppLogRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [sources, setSources] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [srcFilter, setSrcFilter] = useState('all');
  const [lvlFilter, setLvlFilter] = useState('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const load = useCallback((force = false) => {
    setLoading(true);
    setErr(null);
    const params = new URLSearchParams({
      token,
      view: 'logs',
      limit: String(LOG_PAGE_SIZE),
      offset: String(page * LOG_PAGE_SIZE),
    });
    if (srcFilter !== 'all') params.set('source', srcFilter);
    if (lvlFilter !== 'all') params.set('level', lvlFilter);

    const srcKey = `log-sources`;
    const logKey = `logs_${srcFilter}_${lvlFilter}_${page}`;

    if (!force) {
      const cachedLogs = cacheGet<AppLogPage>(logKey);
      const cachedSrc  = cacheGet<{ source: string; count: number }[]>(srcKey);
      if (cachedLogs && cachedSrc && 'rows' in cachedLogs.data) {
        setRows(cachedLogs.data.rows);
        setTotal(cachedLogs.data.total);
        setSources(cachedSrc.data.map(s => s.source));
        setFetchedAt(cachedLogs.fetchedAt);
        setLoading(false);
        return;
      }
    }

    Promise.all([
      fetch(`/api/admin/stats?${params}`).then(r => r.json() as Promise<SF<AppLogPage>>),
      fetch(`/api/admin/stats?token=${encodeURIComponent(token)}&view=log-sources`).then(r => r.json() as Promise<SF<{ source: string; count: number }[]>>),
    ])
      .then(([logsRes, srcRes]) => {
        if (logsRes.data) {
          cacheSet(logKey, logsRes.data);
          setRows(logsRes.data.rows);
          setTotal(logsRes.data.total);
          setFetchedAt(Date.now());
        }
        else setErr(logsRes.error);
        if (srcRes.data) { cacheSet(srcKey, srcRes.data); setSources(srcRes.data.map(s => s.source)); }
      })
      .catch(e => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [token, srcFilter, lvlFilter, page]);

  useEffect(() => { load(); }, [load]);

  const selectSource = (source: string) => {
    setPage(0);
    setExpanded(null);
    setSrcFilter(source);
  };

  const selectLevel = (level: string) => {
    setPage(0);
    setExpanded(null);
    setLvlFilter(level);
  };

  const counts = rows ? {
    debug: rows.filter(r => r.level === 'debug').length,
    info:  rows.filter(r => r.level === 'info').length,
    warn:  rows.filter(r => r.level === 'warn').length,
    error: rows.filter(r => r.level === 'error').length,
  } : null;
  const pageCount = Math.max(1, Math.ceil(total / LOG_PAGE_SIZE));
  const start = total === 0 ? 0 : page * LOG_PAGE_SIZE + 1;
  const end = Math.min(total, (page + 1) * LOG_PAGE_SIZE);

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Source tabs */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {(['all', ...sources]).map(src => (
            <button key={src} style={{ ...s.btn(srcFilter === src), fontSize: '11px', padding: '4px 10px' }} onClick={() => selectSource(src)}>{src}</button>
          ))}
        </div>
        {/* Level filter */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button style={{ ...s.btn(lvlFilter === 'all'), fontSize: '11px', padding: '4px 10px' }} onClick={() => selectLevel('all')}>all</button>
          {LOG_LEVEL_LABELS.map(l => (
            <button key={l} style={{ ...s.btn(lvlFilter === l), fontSize: '11px', padding: '4px 10px', color: lvlFilter === l ? '#fff' : LOG_COLORS[l] }} onClick={() => selectLevel(l)}>{l}</button>
          ))}
        </div>
        {/* Counts */}
        {counts && (
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', marginLeft: '4px' }}>
            {counts.error > 0 && <span style={{ color: '#ff453a', fontWeight: 700 }}>{counts.error} err</span>}
            {counts.warn  > 0 && <span style={{ color: '#ffd60a', fontWeight: 700 }}>{counts.warn} warn</span>}
            {counts.info  > 0 && <span style={{ color: '#30d158' }}>{counts.info} info</span>}
            {counts.debug > 0 && <span style={{ color: '#636366' }}>{counts.debug} debug</span>}
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>{start}-{end} / {total}</span>
          <button
            style={{ ...s.btn(), fontSize: '12px', padding: '4px 10px', opacity: page === 0 || loading ? 0.45 : 1 }}
            disabled={page === 0 || loading}
            onClick={() => setPage(p => Math.max(0, p - 1))}
          >
            Prev
          </button>
          <button
            style={{ ...s.btn(), fontSize: '12px', padding: '4px 10px', opacity: page >= pageCount - 1 || loading ? 0.45 : 1 }}
            disabled={page >= pageCount - 1 || loading}
            onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </button>
          {fetchedAt && <FetchedAt ts={fetchedAt} />}
          <button style={{ ...s.btn(), fontSize: '12px', padding: '4px 10px' }} onClick={() => load(true)}>↺</button>
        </div>
      </div>

      {loading && !rows && <CardSkeleton lines={8} />}
      {err && <Err msg={err} />}

      {rows && (
        <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {rows.length === 0 && (
            <p style={{ color: 'var(--label-secondary)', textAlign: 'center', padding: '32px 0' }}>No logs</p>
          )}
          {Object.entries(
            rows.reduce<Record<string, typeof rows>>((acc, r) => {
              const d = twDate(r.created_at);
              (acc[d] ??= []).push(r);
              return acc;
            }, {})
          ).map(([date, group]) => (
            <Fragment key={date}>
              <div style={{ padding: '6px 0 4px', color: 'var(--label-secondary)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)', marginTop: '8px' }}>
                {date}
              </div>
              {group.map(r => (
                <div key={r.id}>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: '70px 48px 160px 1fr', gap: '0 8px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'baseline', cursor: r.data ? 'pointer' : 'default' }}
                    onClick={() => r.data && setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <span style={{ color: 'var(--label-secondary)' }}>{twTime(r.created_at)}</span>
                    <span style={{ color: LOG_COLORS[r.level], fontWeight: 700 }}>{r.level}</span>
                    <span style={{ color: 'var(--label-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.source}</span>
                    <span style={{ color: r.level === 'error' ? '#ff453a' : r.level === 'warn' ? '#ffd60a' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.message}
                      {r.data && <span style={{ color: '#0a84ff', marginLeft: '6px', fontSize: '10px' }}>▶</span>}
                    </span>
                  </div>
                  {expanded === r.id && r.data && (
                    <pre style={{ margin: '0 0 4px', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', color: 'var(--label-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {(() => { try { return JSON.stringify(JSON.parse(r.data), null, 2); } catch { return r.data; } })()}
                    </pre>
                  )}
                </div>
              ))}
            </Fragment>
          ))}
          {total > LOG_PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', paddingTop: '12px', fontFamily: 'var(--font-sans, sans-serif)' }}>
              <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Page {page + 1} / {pageCount}</span>
              <button
                style={{ ...s.btn(), fontSize: '12px', opacity: page === 0 || loading ? 0.45 : 1 }}
                disabled={page === 0 || loading}
                onClick={() => setPage(p => Math.max(0, p - 1))}
              >
                Prev
              </button>
              <button
                style={{ ...s.btn(), fontSize: '12px', opacity: page >= pageCount - 1 || loading ? 0.45 : 1 }}
                disabled={page >= pageCount - 1 || loading}
                onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Overview panels ───────────────────────────────────────────────────────────

function RecentPosts({ posts, onDrill }: { posts: D1Data['recent_posts']; onDrill: () => void }) {
  return (
    <div style={{ ...s.card, gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <p style={{ ...s.section, margin: 0 }}>最近發布</p>
        <button style={{ ...s.btn(), fontSize: '12px', color: '#0a84ff' }} onClick={onDrill}>查看全部 →</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px' }}>
        {posts.map(p => (
          <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={s.pill(catColor(p.category))}>{p.category}</span>
              <span style={s.pill('#48484a')}>{p.lang}</span>
              <span style={{ ...s.mono, fontSize: '11px', color: 'var(--label-secondary)', marginLeft: 'auto' }}>{p.created_at.slice(0, 10)}</span>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{p.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TTSDetail() {
  const [records, setRecords] = useState<TTSRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/tts/history?type=tts&limit=100')
      .then(r => r.json())
      .then(d => setRecords(d.records))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={s.section}>最近 100 筆 TTS 合成日誌</p>
      </div>
      {loading && <CardSkeleton lines={8} />}
      {err && <Err msg={err} />}
      {records && (
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {records.map(r => (
            <div key={r.id} style={{ ...s.row, flexWrap: 'wrap', gap: '8px', padding: '12px' }}>
              <span style={{ ...s.mono, color: 'var(--label-secondary)', fontSize: '11px' }}>{new Date(r.created_at).toLocaleString()}</span>
              <span style={s.pill('#48484a')}>{r.voice}</span>
              <span style={{ fontSize: '13px', flex: 1, fontWeight: 500 }}>{r.title}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <a href={`/api/tts/audio/${r.audio_filename}`} target="_blank" style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none' }}>WAV ↗</a>
                <a href={`/api/tts/audio/${r.srt_filename}`} target="_blank" style={{ fontSize: '11px', color: 'var(--label-tertiary)', textDecoration: 'none' }}>SRT ↗</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TTS_DEFAULTS: Record<string, string> = {
  tts_voice_zh: 'zh-TW-HsiaoChenNeural',
  tts_voice_en: 'en-US-AvaNeural',
};

function SettingsDetail({ token }: { token: string }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [voices, setVoices] = useState<{ name: string; gender: string; locale: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/stats?token=${encodeURIComponent(token)}&view=settings`)
        .then(r => r.json() as Promise<SF<Record<string, string>>>),
      fetch('/api/tts/voices').then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([d, v]) => {
        if (d.data) setSettings(d.data); else setErr(d.error);
        setVoices(v as any[]);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = () => {
    setSaving(true);
    const toSave = { ...settings };
    for (const [k, v] of Object.entries(TTS_DEFAULTS)) {
      if (!toSave[k]) toSave[k] = v;
    }
    fetch(`/api/admin/stats?token=${encodeURIComponent(token)}&view=settings`, {
      method: 'POST',
      body: JSON.stringify(toSave),
    })
      .then(r => r.json())
      .then(() => { setSettings(toSave); alert('設定已儲存'); })
      .catch(e => alert('儲存失敗：' + e.message))
      .finally(() => setSaving(false));
  };

  const inputStyle = { ...s.mono, width: '100%', padding: '8px', marginTop: '4px', background: 'var(--fill-secondary)', border: '1px solid var(--separator)', borderRadius: '4px', color: 'inherit' };

  const VoiceSelect = ({ settingKey }: { settingKey: string }) => {
    const defaultVoice = TTS_DEFAULTS[settingKey] ?? '';
    const currentValue = settings[settingKey] || '';
    return voices.length > 0 ? (
      <select
        value={currentValue}
        onChange={e => setSettings({ ...settings, [settingKey]: e.target.value })}
        style={inputStyle}
      >
        <option value="">— 使用預設：{defaultVoice} —</option>
        {voices.map(v => (
          <option key={v.name} value={v.name}>
            {v.name === defaultVoice ? `★ ${v.name}` : v.name} ({v.gender}, {v.locale})
          </option>
        ))}
      </select>
    ) : (
      <input
        value={currentValue}
        onChange={e => setSettings({ ...settings, [settingKey]: e.target.value })}
        placeholder={`預設：${defaultVoice}（TTS API 未連線）`}
        style={inputStyle}
      />
    );
  };

  return (
    <div style={{ maxWidth: '500px' }}>
      <p style={s.section}>TTS 語音設定</p>
      {loading ? <CardSkeleton lines={4} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={s.card}>
            <p style={s.label}>繁體中文 (zh-TW) 預設語音</p>
            <VoiceSelect settingKey="tts_voice_zh" />
          </div>
          <div style={s.card}>
            <p style={s.label}>英文 (en) 預設語音</p>
            <VoiceSelect settingKey="tts_voice_en" />
          </div>
          {voices.length === 0 && (
            <p style={{ ...s.label, color: 'var(--label-tertiary)', fontSize: '12px' }}>
              ⚠️ TTS API 未連線，顯示文字輸入框。連線後重新整理可顯示語音選單。
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...s.btn(true), padding: '12px', marginTop: '8px' }}
          >
            {saving ? '儲存中...' : '儲存變更'}
          </button>
        </div>
      )}
      {err && <Err msg={err} />}
    </div>
  );
}

// ── Infra: Config ─────────────────────────────────────────────────────────────

function ConfigDetail({ config }: { config: CfgData }) {
  return (
    <div style={{ maxWidth: '480px' }}>
      <div style={s.card}>
        <p style={s.section}>AI Search Pipeline</p>
        <KV k="embedding" v={config.embedding_model.split('/').at(-1)!} />
        <KV k="dims" v={config.embedding_dims} />
        <KV k="chat model" v={config.chat_model.split('/').at(-1)!} />
        <KV k="topK" v={config.vector_top_k} />
        <KV k="max sources" v={config.max_sources} />
        <p style={{ ...s.section, marginTop: '16px' }}>Infra</p>
        <KV k="D1" v={config.d1_database} />
        <KV k="R2" v={config.r2_bucket} />
        <KV k="Vectorize" v={config.vectorize_index} />
        <KV k="compat" v={config.compatibility_date} />
      </div>
    </div>
  );
}

// ── Moderation ────────────────────────────────────────────────────────────────

function ModerationTab({ token }: { token: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);

  async function fetchComments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comments-list?token=${token}`);
      const data: CommentsData = await res.json();
      setComments(data.rows ?? []);
    } catch {
      setComments([]);
    }
    setLoading(false);
  }

  useEffect(() => { fetchComments(); }, [token]);

  async function toggleHidden(id: number, currentHidden: number) {
    const newHidden = currentHidden === 1 ? 0 : 1;
    await fetch(`/api/admin/comments/${id}?token=${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden: newHidden }),
    });
    setComments(prev => prev.map(c => c.id === id ? { ...c, hidden: newHidden } : c));
  }

  async function deleteComment(id: number) {
    if (!confirm('確定刪除這則留言？')) return;
    await fetch(`/api/admin/comments/${id}?token=${token}`, { method: 'DELETE' });
    setComments(prev => prev.filter(c => c.id !== id));
  }

  const visible = showHidden ? comments : comments.filter(c => c.hidden === 0);

  if (loading) return <p style={{ color: 'var(--label-tertiary)', padding: '20px' }}>載入中⋯</p>;

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>共 {comments.length} 則留言（{comments.filter(c => c.hidden).length} 則已隱藏）</span>
        <label style={{ fontSize: '13px', color: 'var(--label-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} style={{ marginRight: '6px' }} />
          顯示已隱藏
        </label>
      </div>
      {visible.length === 0 && <p style={{ color: 'var(--label-tertiary)', fontSize: '14px' }}>沒有留言</p>}
      {visible.map(c => (
        <div key={c.id} style={{
          padding: '14px', marginBottom: '10px', borderRadius: 'var(--radius-sm)',
          border: '0.5px solid var(--separator)', background: c.hidden ? 'color-mix(in srgb, #e53e3e 8%, var(--bg-secondary))' : 'var(--bg-secondary)',
          opacity: c.hidden ? 0.6 : 1,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: 'var(--label-tertiary)', marginBottom: '6px' }}>
                <strong style={{ color: 'var(--label-secondary)' }}>{c.author_name}</strong>
                {' · '}
                <a href={`/posts/${c.post_slug}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{c.post_slug}</a>
                {' · '}{c.created_at}
                {c.hidden === 1 && <span style={{ color: '#e53e3e', marginLeft: '8px' }}>已隱藏</span>}
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--label)', whiteSpace: 'pre-wrap' }}>{c.body}</p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button onClick={() => toggleHidden(c.id, c.hidden)}
                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px', border: '0.5px solid var(--separator)', background: 'var(--bg)', color: 'var(--label-secondary)', cursor: 'pointer' }}>
                {c.hidden ? '顯示' : '隱藏'}
              </button>
              <button onClick={() => deleteComment(c.id)}
                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px', border: '0.5px solid #e53e3e', background: 'transparent', color: '#e53e3e', cursor: 'pointer' }}>
                刪除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab navigation ────────────────────────────────────────────────────────────

const MAIN_TABS = [
  { id: 'overview'    as MainTab, label: 'Overview' },
  { id: 'content'     as MainTab, label: 'Content' },
  { id: 'search'      as MainTab, label: 'Search' },
  { id: 'infra'       as MainTab, label: 'Infra' },
  { id: 'system'      as MainTab, label: 'System' },
  { id: 'moderation'  as MainTab, label: '🗨️ 留言' },
];

const SUB_TABS: Record<string, { id: string; label: string }[]> = {
  content: [{ id: 'posts', label: 'Posts' }, { id: 'tts', label: 'TTS' }],
  search:  [{ id: 'analytics', label: 'Analytics' }, { id: 'searchlogs', label: 'Logs' }, { id: 'search-traces', label: 'Traces' }],
  infra:   [{ id: 'vectorize', label: 'Vectorize' }, { id: 'r2', label: 'R2' }, { id: 'config', label: 'Config' }],
  system:  [{ id: 'logs', label: 'App Logs' }, { id: 'pageviews', label: 'Page Views' }, { id: 'settings', label: 'Settings' }],
};

const DEFAULT_SUB: Record<MainTab, string> = {
  overview: '', content: 'posts', search: 'analytics', infra: 'vectorize', system: 'logs', moderation: '',
};

function TabBar({ active, onChange }: { active: MainTab; onChange: (t: MainTab) => void }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--separator,rgba(255,255,255,0.1))', marginBottom: '24px' }}>
      {MAIN_TABS.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{
          padding: '10px 18px', fontSize: '14px', fontWeight: 600,
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: active === tab.id ? '2px solid #0a84ff' : '2px solid transparent',
          color: active === tab.id ? '#0a84ff' : 'var(--label-secondary)',
          marginBottom: '-1px',
        }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function SubTabBar({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
      {tabs.map(t => (
        <button key={t.id} style={s.btn(active === t.id)} onClick={() => onChange(t.id)}>{t.label}</button>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [subTabs, setSubTabs] = useState<Record<string, string>>(DEFAULT_SUB);

  useEffect(() => {
    const saved = loadSession();
    if (saved) setToken(saved);
  }, []);

  const fetchOverview = useCallback((t: string, force = false) => {
    if (!force) {
      const cached = cacheGet<Overview>('overview');
      if (cached) { setData(cached.data); setFetchedAt(cached.fetchedAt); return; }
    }
    setLoading(true);
    setFetchErr(null);
    fetch(`/api/admin/stats?token=${encodeURIComponent(t)}`)
      .then(async res => {
        if (res.status === 401) { localStorage.removeItem(TOKEN_KEY); setToken(null); throw new Error('Unauthorized'); }
        return res.json() as Promise<Overview>;
      })
      .then(d => {
        saveSession(t);
        cacheSet('overview', d);
        setData(d);
        setFetchedAt(Date.now());
      })
      .catch(e => setFetchErr((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (token) fetchOverview(token); }, [token, fetchOverview]);

  if (!token) return <AuthForm onSubmit={setToken} />;

  const d1 = data?.d1.data;
  const contentStats = data?.content_stats.data;

  const goToTab = (tab: MainTab, sub?: string) => {
    setActiveTab(tab);
    if (sub) setSubTabs(prev => ({ ...prev, [tab]: sub }));
  };

  const setSub = (tab: string) => (id: string) => setSubTabs(prev => ({ ...prev, [tab]: id }));

  const renderContent = () => {
    // ── Overview ──
    if (activeTab === 'overview') {
      return (
        <>
          {loading && <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{[200, 300, 250, 180].map((w, i) => <Skeleton key={i} h={80} w={`${w}px`} />)}</div>}
          {fetchErr && <p style={s.err}>Error: {fetchErr} <button style={{ color: '#0a84ff', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => token && fetchOverview(token, true)}>retry</button></p>}
          {data && !loading && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px', marginBottom: '16px' }}>
                <Stat label="Posts in D1" value={d1?.posts ?? '–'} sub={`${d1?.doc_chunks ?? 0} chunks`} onClick={() => goToTab('content', 'posts')} />
                <Stat label="Draft: true" value={contentStats?.draft_true ?? '–'} sub="content files" />
                <Stat label="Draft: false" value={contentStats?.draft_false ?? '–'} sub="content files" />
                <Stat label="Published + Audio" value={contentStats?.published_with_audio ?? '–'} sub="draft:false & audio_url" />
                <Stat label="Searches (all)" value={d1?.search_logs ?? '–'} sub="AI search queries" onClick={() => goToTab('search', 'searchlogs')} />
                <Stat label="RAG Traces" value={d1?.search_logs ?? '–'} sub="品質標記 & trace 瀏覽" onClick={() => goToTab('search', 'search-traces')} />
                <Stat
                  label="LLM 成功率 (7d)"
                  value={`${pct(d1?.search_stats.llm_ok ?? 0, d1?.search_stats.total ?? 1)}%`}
                  color={pct(d1?.search_stats.llm_ok ?? 0, d1?.search_stats.total ?? 1) >= 80 ? '#30d158' : '#ffd60a'}
                  sub={`${d1?.search_stats.total ?? 0} queries`}
                />
                <Stat label="Avg 耗時 (7d)" value={`${d1?.search_stats.avg_ms ?? 0}`} sub="ms" />
                <Stat label="R2 Objects" value={data.r2.data ? (data.r2.data.truncated ? '1000+' : data.r2.data.count) : '–'} sub="OG images" onClick={() => goToTab('infra', 'r2')} />
                <Stat label="TTS Logs" value="View" sub="Synthesis history" onClick={() => goToTab('content', 'tts')} />
                <Stat label="Vectorize" value={data.vectorize.data?.chunk_count ?? '–'} sub={`${data.vectorize.data?.dimensions ?? 0}D ${data.vectorize.data?.embedding_model.split('/').at(-1) ?? ''}`} onClick={() => goToTab('infra', 'vectorize')} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '16px', marginBottom: '16px' }}>
                {d1 && <div style={s.card}><CategoryPieChart data={d1.category_distribution} total={d1.posts} /></div>}
                {d1 && <div style={s.card}><LangDonutChart data={d1.lang_distribution} /></div>}
                {d1 && (
                  <div style={s.card}>
                    <PostsTrendChart data={d1.posts_trend} />
                    <div style={{ marginTop: '16px' }}><SearchTrendChart data={d1.search_trend} /></div>
                  </div>
                )}
              </div>

              {d1 && <RecentPosts posts={d1.recent_posts} onDrill={() => goToTab('content', 'posts')} />}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '16px', marginTop: '16px' }}>
                {d1 && (
                  <div style={s.card}>
                    <p style={s.section}>Search Analytics (7d)</p>
                    <SearchStatsGauges stats={d1.search_stats} />
                  </div>
                )}
                {d1 && d1.page_views_top.length > 0 && (
                  <div style={s.card}><PageViewsChart data={d1.page_views_top} /></div>
                )}
                {data.config.data && (
                  <div style={s.card}>
                    <p style={s.section}>AI Search Pipeline</p>
                    <KV k="embedding" v={data.config.data.embedding_model.split('/').at(-1)!} />
                    <KV k="dims" v={data.config.data.embedding_dims} />
                    <KV k="chat model" v={data.config.data.chat_model.split('/').at(-1)!} />
                    <KV k="topK" v={data.config.data.vector_top_k} />
                    <KV k="max sources" v={data.config.data.max_sources} />
                    <p style={{ ...s.section, marginTop: '16px' }}>Infra</p>
                    <KV k="D1" v={data.config.data.d1_database} />
                    <KV k="R2" v={data.config.data.r2_bucket} />
                    <KV k="Vectorize" v={data.config.data.vectorize_index} />
                    <KV k="compat" v={data.config.data.compatibility_date} />
                  </div>
                )}
              </div>
            </>
          )}
        </>
      );
    }

    // ── Content ──
    if (activeTab === 'content') {
      const sub = subTabs.content;
      return (
        <>
          <SubTabBar tabs={SUB_TABS.content} active={sub} onChange={setSub('content')} />
          {sub === 'posts' && (data?.posts.data
            ? <PostsDetail posts={data.posts.data} />
            : loading ? <CardSkeleton lines={6} /> : <p style={{ color: 'var(--label-secondary)' }}>No data</p>
          )}
          {sub === 'tts' && <TTSDetail />}
        </>
      );
    }

    // ── Search ──
    if (activeTab === 'search') {
      const sub = subTabs.search;
      return (
        <>
          <SubTabBar tabs={SUB_TABS.search} active={sub} onChange={setSub('search')} />
          {sub === 'analytics' && (
            d1 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '16px' }}>
                <div style={s.card}>
                  <p style={s.section}>Search Stats (7d)</p>
                  <SearchStatsGauges stats={d1.search_stats} />
                </div>
                <div style={s.card}><SearchTrendChart data={d1.search_trend} /></div>
              </div>
            ) : loading ? <CardSkeleton lines={4} /> : null
          )}
          {sub === 'searchlogs' && <SearchLogsDetail token={token} />}
          {sub === 'search-traces' && <SearchTracesDetail token={token} />}
        </>
      );
    }

    // ── Infra ──
    if (activeTab === 'infra') {
      const sub = subTabs.infra;
      return (
        <>
          <SubTabBar tabs={SUB_TABS.infra} active={sub} onChange={setSub('infra')} />
          {sub === 'vectorize' && (data?.vectorize.data
            ? <VectorizeDetail vec={data.vectorize.data} token={token} />
            : loading ? <CardSkeleton lines={4} /> : null
          )}
          {sub === 'r2' && <R2Detail token={token} />}
          {sub === 'config' && (data?.config.data
            ? <ConfigDetail config={data.config.data} />
            : loading ? <CardSkeleton lines={4} /> : null
          )}
        </>
      );
    }

    // ── System ──
    if (activeTab === 'system') {
      const sub = subTabs.system;
      return (
        <>
          <SubTabBar tabs={SUB_TABS.system} active={sub} onChange={setSub('system')} />
          {sub === 'logs' && <LogsPanel token={token} />}
          {sub === 'pageviews' && <PageViewsDetail token={token} />}
          {sub === 'settings' && <SettingsDetail token={token} />}
        </>
      );
    }

    // ── Moderation ──
    if (activeTab === 'moderation') {
      return <ModerationTab token={token} />;
    }
  };

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 4px' }}>Engineer News Admin</h1>
          <p style={{ fontSize: '13px', color: 'var(--label-secondary)', margin: 0 }}>
            Cloudflare Pages · D1 · R2 · Vectorize · Workers AI
            {fetchedAt && <FetchedAt ts={fetchedAt} />}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={s.btn()} onClick={() => token && fetchOverview(token, true)}>↺ 重新整理</button>
          <button style={{ ...s.btn(), color: 'var(--label-secondary)' }} onClick={() => { localStorage.removeItem(TOKEN_KEY); setToken(null); }}>登出</button>
        </div>
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />
      {renderContent()}
    </div>
  );
}
