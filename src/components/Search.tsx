import React, { useState, useEffect, useRef, useCallback } from 'react';

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

interface Props {
  lang?: 'zh-TW' | 'en';
}

function parseStreamPayload(payload: string) {
  const trimmed = payload.trim();
  if (!trimmed) return '';
  if (trimmed === '[DONE]') return '';

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

function renderAnswer(answer: string, sources: RagSource[]) {
  const parts = answer.split(/(\[\d+\])/g);

  return parts.map((part, index) => {
    const citation = part.match(/^\[(\d+)\]$/);
    if (citation) {
      const citationIndex = Number(citation[1]);
      const source = sources.find((item) => item.citation === citationIndex);
      if (source) {
        return (
          <a
            key={`${part}-${index}`}
            href={source.url}
            title={source.title}
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            {part}
          </a>
        );
      }
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export default function Search({ lang = 'zh-TW' }: Props) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<RagSource[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEn = lang === 'en';
  const placeholder = isEn ? 'Semantic search...' : '語義搜尋技術知識...';
  const noResultsText = isEn ? 'No results found.' : '沒有找到相關結果。';
  const resultsLabel = isEn ? 'RAG Answer' : 'RAG 回答';
  const sourcesLabel = isEn ? 'Cited Sources' : '引用來源';

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setAnswer('');
      setSources([]);
      setSearched(false);
      return;
    }

    setIsSearching(true);
    setAnswer('');
    setSources([]);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, lang }),
      });

      if (!res.ok) {
        throw new Error(`Search failed: ${res.status}`);
      }

      const sourceHeader = res.headers.get('x-rag-sources');
      if (sourceHeader) {
        try {
          const parsed = JSON.parse(sourceHeader) as RagSource[];
          setSources(Array.isArray(parsed) ? parsed : []);
        } catch {
          setSources([]);
        }
      }

      const reader = res.body?.getReader();
      if (!reader) {
        const text = await res.text();
        setAnswer(text);
        setSearched(true);
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
          setAnswer(finalAnswer);
          continue;
        }

        buffer += chunk;
        let separatorIndex = buffer.indexOf('\n\n');
        while (separatorIndex !== -1) {
          const rawEvent = buffer.slice(0, separatorIndex).trim();
          buffer = buffer.slice(separatorIndex + 2);

          if (rawEvent) {
            const payload = rawEvent
              .split(/\r?\n/)
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trimStart())
              .join('\n');
            const delta = parseStreamPayload(payload);
            if (delta) {
              finalAnswer += delta;
              setAnswer(finalAnswer);
            }
          }

          separatorIndex = buffer.indexOf('\n\n');
        }
      }

      if (streamMode === 'sse' && buffer.trim()) {
        const payload = buffer
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n');
        const delta = parseStreamPayload(payload);
        if (delta) {
          finalAnswer += delta;
          setAnswer(finalAnswer);
        }
      }

      setSearched(true);
    } catch {
      setAnswer('');
      setSources([]);
      setSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, [lang]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '11px 44px 11px 16px',
            borderRadius: '10px',
            border: '0.5px solid var(--separator)',
            background: 'var(--bg-secondary)',
            color: 'var(--label)',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--separator)')}
        />
        <div style={{
          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '11px', color: 'var(--label-secondary)',
          background: 'var(--bg-tertiary)', border: '0.5px solid var(--separator)',
          borderRadius: '5px', padding: '2px 6px', fontFamily: 'monospace',
          pointerEvents: 'none',
        }}>
          {isSearching ? '…' : '⌘K'}
        </div>
      </div>

      {searched && (
        <div style={{ marginTop: '16px', display: 'grid', gap: '16px' }}>
          {answer ? (
            <section style={{
              border: '0.5px solid var(--separator)',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              padding: '16px 18px',
            }}>
              <p style={{
                margin: '0 0 10px',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--label-secondary)',
              }}>
                {resultsLabel}
              </p>
              <div style={{
                margin: 0,
                fontSize: '15px',
                lineHeight: 1.8,
                color: 'var(--label)',
                whiteSpace: 'pre-wrap',
              }}>
                {renderAnswer(answer, sources)}
              </div>
            </section>
          ) : !isSearching ? (
            <p style={{ fontSize: '14px', color: 'var(--label-secondary)', margin: '0', padding: '12px 0' }}>
              {noResultsText}
            </p>
          ) : null}

          {sources.length > 0 && (
            <section>
              <p style={{
                margin: '0 0 10px',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--label-secondary)',
              }}>
                {sourcesLabel}
              </p>
              <div style={{ display: 'grid', gap: '8px' }}>
                {sources.map((source) => (
                  <a
                    key={source.chunkId}
                    href={source.url}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'var(--bg-secondary)',
                      border: '0.5px solid var(--separator)',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--label)' }}>
                        [{source.citation}] {source.title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--accent)', flexShrink: 0 }}>
                        {(source.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--label-secondary)', lineHeight: 1.6 }}>
                      {source.excerpt}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
