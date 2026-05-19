import { useState, useEffect } from 'react';
import { getVisitorId } from '../lib/visitor';

interface Comment {
  id: number;
  author_name: string;
  author_url: string | null;
  body: string;
  created_at: number;
}

interface Props {
  slug: string;
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function CommentSection({ slug }: Props) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [count, setCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(({ comments: c }: { comments: Comment[] }) => setCount(c.length))
      .catch(() => {});
  }, [slug]);

  function handleToggle() {
    if (!open && comments.length === 0) {
      setLoadingList(true);
      fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
        .then(r => r.json())
        .then(({ comments: c }: { comments: Comment[] }) => { setComments(c); setCount(c.length); setLoadingList(false); })
        .catch(() => setLoadingList(false));
    }
    setOpen(o => !o);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    const visitorId = getVisitorId();
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Visitor-ID': visitorId },
        body: JSON.stringify({ slug, body: body.trim(), author_name: name.trim() || undefined, author_url: url.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '留言失敗，請稍後再試');
      } else {
        setComments(prev => [...prev, data.comment]);
        setCount(c => c + 1);
        setBody('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError('網路錯誤，請稍後再試');
    }
    setSubmitting(false);
  }

  return (
    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '0.5px solid var(--separator)' }}>
      <button
        onClick={handleToggle}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--label-secondary)', fontSize: '14px', fontWeight: 600,
        }}
      >
        <span>💬 留言（{count}）</span>
        <span style={{ opacity: 0.5 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '20px' }}>
          {loadingList && <p style={{ color: 'var(--label-tertiary)', fontSize: '14px' }}>載入留言中⋯</p>}

          {comments.map(c => (
            <div key={c.id} style={{ padding: '14px 0', borderBottom: '0.5px solid var(--separator)' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '6px' }}>
                {c.author_url
                  ? <a href={c.author_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--accent)', textDecoration: 'none' }}>{c.author_name}</a>
                  : <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--label)' }}>{c.author_name}</span>
                }
                <span style={{ fontSize: '12px', color: 'var(--label-tertiary)' }}>{formatDate(c.created_at)}</span>
              </div>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: 'var(--label-secondary)', whiteSpace: 'pre-wrap' }}>{c.body}</p>
            </div>
          ))}

          {comments.length === 0 && !loadingList && (
            <p style={{ fontSize: '14px', color: 'var(--label-tertiary)', marginBottom: '20px' }}>還沒有留言，來當第一個！</p>
          )}

          <form onSubmit={handleSubmit} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text" placeholder="名稱（選填）" value={name}
                onChange={e => setName(e.target.value)} maxLength={50}
                style={{ flex: 1, minWidth: '140px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--separator)', background: 'var(--bg-secondary)', color: 'var(--label)', fontSize: '14px' }}
              />
              <input
                type="url" placeholder="網址（選填）" value={url}
                onChange={e => setUrl(e.target.value)}
                style={{ flex: 1, minWidth: '140px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--separator)', background: 'var(--bg-secondary)', color: 'var(--label)', fontSize: '14px' }}
              />
            </div>
            <textarea
              placeholder="留言內容⋯（最多 1000 字）" value={body} required
              onChange={e => setBody(e.target.value)} maxLength={1000} rows={4}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--separator)', background: 'var(--bg-secondary)', color: 'var(--label)', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' }}
            />
            {error && <p style={{ color: '#e53e3e', fontSize: '13px', margin: 0 }}>{error}</p>}
            {success && <p style={{ color: '#38a169', fontSize: '13px', margin: 0 }}>留言成功！</p>}
            <button
              type="submit" disabled={submitting || !body.trim()}
              style={{
                alignSelf: 'flex-end', padding: '8px 20px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)', color: '#fff', border: 'none', cursor: submitting ? 'wait' : 'pointer',
                fontSize: '14px', fontWeight: 600, opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? '送出中⋯' : '送出留言'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
