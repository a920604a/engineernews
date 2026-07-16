import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DAILY_LIMIT, readUsage, writeUsage } from '../lib/quota';

interface RagSource {
  citation: number;
  postId: string;
  title: string;
  url: string;
  excerpt: string;
  score: number;
  lang: 'zh-TW' | 'en';
  category: string;
  chunkId: string;
}

type Scope = 'post' | 'site';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: RagSource[];
  scope?: Scope;
}

interface Props {
  lang: 'zh-TW' | 'en';
  onClose: () => void;
  postId?: string;
  postTitle?: string;
  initialQuery?: string;
  initialScope?: Scope;
}

const SUGGESTED_SITE: Record<string, string[]> = {
  'zh-TW': [
    '什麼是 RAG？和傳統搜尋有什麼不同？',
    'AI Agent 是什麼？適合解決哪些問題？',
    'Cloudflare Workers 有哪些適合的使用場景？',
    '如何決定是否需要 fine-tuning 模型？',
  ],
  en: [
    'What is RAG and how is it different from traditional search?',
    'What are AI Agents best used for?',
    'What are good use cases for Cloudflare Workers?',
    'When should you fine-tune a model vs. prompt engineer?',
  ],
};

const SUGGESTED_POST: Record<string, string[]> = {
  'zh-TW': [
    '幫我總結重點',
    '這篇的取捨是什麼？',
    '有什麼實際應用場景？',
  ],
  en: [
    'Summarize the key takeaway',
    'What are the tradeoffs?',
    'Real-world use cases?',
  ],
};

function parseStreamPayload(payload: string): string {
  const trimmed = payload.trim();
  if (!trimmed || trimmed === '[DONE]') return '';
  try {
    const parsed = JSON.parse(trimmed);
    const delta = parsed?.choices?.[0]?.delta?.content;
    if (typeof delta === 'string') return delta;
    const response = parsed?.response;
    if (typeof response === 'string') return response;
    const text = parsed?.text;
    if (typeof text === 'string') return text;
    return '';
  } catch {
    return trimmed;
  }
}

function injectCitationLinks(text: string, sources: RagSource[]): string {
  return text.replace(/\[(\d+)\]/g, (match, n) => {
    const source = sources.find((s) => s.citation === Number(n));
    if (source) {
      const title = source.title.replace(/"/g, "'");
      return `[[${n}]](${source.url} "${title}")`;
    }
    return match;
  });
}

export default function ChatWidget({ lang, onClose, postId, postTitle, initialQuery, initialScope }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usedCount, setUsedCount] = useState(0);
  const [scope, setScope] = useState<Scope>(initialScope ?? (postId ? 'post' : 'site'));
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSentRef = useRef<string | null>(null);

  const isEn = lang === 'en';
  const suggested = scope === 'post'
    ? (SUGGESTED_POST[lang] ?? SUGGESTED_POST['zh-TW'])
    : (SUGGESTED_SITE[lang] ?? SUGGESTED_SITE['zh-TW']);
  const remaining = Math.max(0, DAILY_LIMIT - usedCount);
  const isLimitReached = remaining === 0;
  const canScopePost = Boolean(postId);

  useEffect(() => {
    setUsedCount(readUsage());
    inputRef.current?.focus();
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || isLoading) return;

    const currentCount = readUsage();
    if (currentCount >= DAILY_LIMIT) {
      setUsedCount(currentCount);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const newCount = currentCount + 1;
    writeUsage(newCount);
    setUsedCount(newCount);

    const activeScope: Scope = scope === 'post' && postId ? 'post' : 'site';
    setMessages((prev) => [...prev, { role: 'user', content: trimmed, scope: activeScope }]);
    setInput('');
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: 'assistant', content: '', sources: [], scope: activeScope }]);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          activeScope === 'post'
            ? { query: trimmed, lang, postId }
            : { query: trimmed, lang }
        ),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`${res.status}`);

      const sourceHeader = res.headers.get('x-rag-sources');
      let sources: RagSource[] = [];
      if (sourceHeader) {
        try {
          const parsed = JSON.parse(sourceHeader) as RagSource[];
          sources = Array.isArray(parsed) ? parsed : [];
        } catch { /* ignore */ }
      }

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], sources };
        return next;
      });

      const reader = res.body?.getReader();
      if (!reader) {
        const text = await res.text();
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], content: text };
          return next;
        });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let streamMode: 'unknown' | 'text' | 'sse' = 'unknown';
      let finalAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (streamMode === 'unknown') {
          streamMode = chunk.includes('data:') || chunk.includes('\n\n') ? 'sse' : 'text';
        }

        if (streamMode === 'text') {
          finalAnswer += chunk;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], content: finalAnswer };
            return next;
          });
          continue;
        }

        buffer += chunk;
        let sep = buffer.indexOf('\n\n');
        while (sep !== -1) {
          const raw = buffer.slice(0, sep).trim();
          buffer = buffer.slice(sep + 2);
          if (raw) {
            const payload = raw
              .split(/\r?\n/)
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.slice(5).trimStart())
              .join('\n');
            const delta = parseStreamPayload(payload);
            if (delta) {
              finalAnswer += delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], content: finalAnswer };
                return next;
              });
            }
          }
          sep = buffer.indexOf('\n\n');
        }
      }

      if (streamMode === 'sse' && buffer.trim()) {
        const payload = buffer
          .split(/\r?\n/)
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart())
          .join('\n');
        const delta = parseStreamPayload(payload);
        if (delta) {
          finalAnswer += delta;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], content: finalAnswer };
            return next;
          });
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: isEn ? 'Search failed, please try again.' : '搜尋失敗，請稍後再試。',
        };
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, [lang, isLoading, scope, postId]);

  useEffect(() => {
    if (!initialQuery) return;
    if (autoSentRef.current === initialQuery) return;
    autoSentRef.current = initialQuery;
    void send(initialQuery);
  }, [initialQuery, send]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-secondary)', borderRadius: 'inherit' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '0.5px solid var(--separator)', flexShrink: 0, gap: '8px',
      }}>
        {canScopePost ? (
          <div role="tablist" aria-label={isEn ? 'Scope' : '範圍'} style={{
            display: 'flex', gap: '2px', padding: '2px',
            background: 'var(--bg-tertiary)', borderRadius: '999px',
            border: '0.5px solid var(--separator)', flexShrink: 0,
          }}>
            <button
              role="tab"
              aria-selected={scope === 'post'}
              onClick={() => setScope('post')}
              style={{
                padding: '3px 10px', borderRadius: '999px', border: 'none',
                background: scope === 'post' ? 'var(--accent)' : 'transparent',
                color: scope === 'post' ? '#fff' : 'var(--label-secondary)',
                fontSize: '11.5px', fontWeight: 600, cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {isEn ? 'This post' : '問這篇'}
            </button>
            <button
              role="tab"
              aria-selected={scope === 'site'}
              onClick={() => setScope('site')}
              style={{
                padding: '3px 10px', borderRadius: '999px', border: 'none',
                background: scope === 'site' ? 'var(--accent)' : 'transparent',
                color: scope === 'site' ? '#fff' : 'var(--label-secondary)',
                fontSize: '11.5px', fontWeight: 600, cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {isEn ? 'Whole site' : '問整站'}
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--label)' }}>
            {isEn ? 'Ask Engineer News' : '問 Engineer News'}
          </span>
        )}
        <span style={{
          fontSize: '11px', color: isLimitReached ? '#ff5f57' : 'var(--label-tertiary)',
          fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        }}>
          {isLimitReached
            ? (isEn ? 'Daily limit reached' : '今日次數已用完')
            : (isEn ? `${remaining} left today` : `今日剩 ${remaining} 次`)}
        </span>
        <button onClick={onClose} aria-label="Close" style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--label-secondary)', fontSize: '18px', lineHeight: 1, padding: '2px 6px', borderRadius: '6px', flexShrink: 0,
        }}>
          ✕
        </button>
      </div>

      {/* Current-post pill — only when post scope active */}
      {canScopePost && scope === 'post' && postTitle && (
        <div style={{
          padding: '8px 16px', borderBottom: '0.5px solid var(--separator)', flexShrink: 0,
          fontSize: '11.5px', color: 'var(--label-tertiary)',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ opacity: 0.7 }}>{isEn ? 'Grounded in:' : '正在討論：'}</span>
          <span style={{
            color: 'var(--label-secondary)', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {postTitle}
          </span>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Limit reached banner */}
        {isLimitReached && messages.length === 0 && (
          <div style={{
            padding: '12px 14px', borderRadius: '10px',
            background: 'color-mix(in srgb, #ff5f57 10%, transparent)',
            border: '0.5px solid color-mix(in srgb, #ff5f57 30%, transparent)',
            fontSize: '13px', color: 'var(--label-secondary)', lineHeight: 1.5,
          }}>
            {isEn
              ? 'You\'ve reached the daily limit of 10 questions. Come back tomorrow!'
              : '今日 10 次問答已用完，明天再來吧！'}
          </div>
        )}

        {/* Suggested questions — only before first message and within limit */}
        {messages.length === 0 && !isLimitReached && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '12px', color: 'var(--label-tertiary)', margin: '0 0 4px' }}>
              {isEn ? 'Suggested questions' : '推薦問題'}
            </p>
            {suggested.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                style={{
                  textAlign: 'left', padding: '8px 12px',
                  background: 'var(--bg-tertiary)', border: '0.5px solid var(--separator)',
                  borderRadius: '10px', color: 'var(--label)', fontSize: '13px',
                  cursor: 'pointer', lineHeight: 1.5, transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--glass)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '4px',
          }}>
            <div style={{
              maxWidth: '85%', padding: '8px 12px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: msg.role === 'user' ? '#fff' : 'var(--label)',
              fontSize: '14px', lineHeight: 1.6,
            }}>
              {msg.role === 'user' ? (
                msg.content
              ) : msg.content ? (
                <div className="chat-md">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => (
                        <a href={href} style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {injectCitationLinks(msg.content, msg.sources ?? [])}
                  </ReactMarkdown>
                </div>
              ) : (
                <span style={{ opacity: 0.4, letterSpacing: '3px' }}>●●●</span>
              )}
            </div>

            {/* Source pills — shown after stream completes */}
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && msg.content && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '85%' }}>
                {msg.sources.map((src) => (
                  <a key={src.chunkId} href={src.url} title={src.title} style={{
                    fontSize: '11px', padding: '2px 7px',
                    background: 'var(--glass)', border: '0.5px solid var(--separator)',
                    borderRadius: '20px', color: 'var(--accent)', textDecoration: 'none',
                  }}>
                    [{src.citation}]
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{
        display: 'flex', gap: '8px', padding: '12px 16px',
        borderTop: '0.5px solid var(--separator)', flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isEn ? 'Ask anything...' : '輸入問題...'}
          disabled={isLoading || isLimitReached}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: '10px',
            border: '0.5px solid var(--separator)', background: 'var(--bg-tertiary)',
            color: isLimitReached ? 'var(--label-tertiary)' : 'var(--label)',
            fontSize: '14px', outline: 'none',
            cursor: isLimitReached ? 'not-allowed' : 'text',
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || isLimitReached}
          style={{
            padding: '8px 14px', borderRadius: '10px', background: 'var(--accent)',
            color: '#fff', border: 'none', fontSize: '14px', fontWeight: 600,
            cursor: isLoading || !input.trim() || isLimitReached ? 'not-allowed' : 'pointer',
            opacity: isLoading || !input.trim() || isLimitReached ? 0.5 : 1, transition: 'opacity 0.15s',
          }}
        >
          {isLoading ? '…' : isEn ? 'Send' : '送出'}
        </button>
      </form>
    </div>
  );
}
