import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  postId: string;
  lang?: 'zh-TW' | 'en';
}

interface FaqRow {
  id: number;
  query: string;
  answer: string;
  lang: string;
  created_at: string;
}

export const PostFaq: React.FC<Props> = ({ postId, lang = 'zh-TW' }) => {
  const [rows, setRows] = useState<FaqRow[] | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const isEn = lang === 'en';

  useEffect(() => {
    const params = new URLSearchParams({ post_id: postId, lang });
    fetch(`/api/post-faq?${params.toString()}`)
      .then(r => r.json() as Promise<{ rows: FaqRow[] }>)
      .then(d => {
        setRows(d.rows ?? []);
        if (d.rows && d.rows.length > 0) setOpenId(d.rows[0].id);
      })
      .catch(() => setRows([]));
  }, [postId, lang]);

  if (!rows || rows.length === 0) return null;

  const title = isEn ? 'Frequently Asked Questions' : '讀者常問';
  const hint = isEn
    ? 'Reader-submitted questions, curated and answered based on this article.'
    : '整理自讀者用「問這篇文章」提出的問題，經人工審核採用。';

  return (
    <div className="post-faq">
      <div className="post-faq-head">
        <span className="post-faq-icon" aria-hidden>❓</span>
        <span className="post-faq-title">{title}</span>
      </div>
      <p className="post-faq-hint">{hint}</p>

      <div className="post-faq-list">
        {rows.map(row => {
          const isOpen = openId === row.id;
          return (
            <div key={row.id} className={`post-faq-item ${isOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="post-faq-q"
                onClick={() => setOpenId(isOpen ? null : row.id)}
                aria-expanded={isOpen}
              >
                <span className="post-faq-q-text">{row.query}</span>
                <span className="post-faq-chevron" aria-hidden>{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div className="post-faq-a">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => (
                        <a href={href} style={{ color: 'var(--accent)', fontWeight: 700 }}>{children}</a>
                      ),
                    }}
                  >
                    {row.answer}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .post-faq {
          background: var(--bg-secondary);
          border: 0.5px solid var(--separator);
          border-radius: 12px;
          padding: 18px 20px;
          margin-top: 32px;
        }
        .post-faq-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .post-faq-icon { font-size: 15px; }
        .post-faq-title { font-size: 14px; font-weight: 700; color: var(--label); letter-spacing: -0.01em; }
        .post-faq-hint { margin: 0 0 12px; font-size: 11.5px; color: var(--label-tertiary); }
        .post-faq-list { display: flex; flex-direction: column; gap: 6px; }
        .post-faq-item {
          border: 0.5px solid var(--separator);
          border-radius: 8px;
          background: var(--bg);
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .post-faq-item.is-open { border-color: var(--accent); }
        .post-faq-q {
          width: 100%; text-align: left; background: transparent; border: none;
          padding: 12px 14px; cursor: pointer; color: var(--label);
          display: flex; align-items: center; gap: 10px; justify-content: space-between;
          font-size: 14px; font-weight: 600; line-height: 1.5;
        }
        .post-faq-q-text { flex: 1; min-width: 0; }
        .post-faq-chevron {
          flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--fill-secondary); color: var(--label-secondary);
          font-size: 14px; font-weight: 700; line-height: 1;
        }
        .post-faq-item.is-open .post-faq-chevron { background: var(--accent); color: #fff; }
        .post-faq-a {
          padding: 0 14px 14px; font-size: 14px; line-height: 1.7; color: var(--label);
        }
        .post-faq-a :global(p) { margin: 0 0 10px; }
        .post-faq-a :global(p:last-child) { margin-bottom: 0; }
        .post-faq-a :global(ul), .post-faq-a :global(ol) { margin: 0 0 10px; padding-left: 1.3em; }
        .post-faq-a :global(code) { background: var(--glass, rgba(127,127,127,0.12)); padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
      `}} />
    </div>
  );
};
