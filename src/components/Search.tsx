import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SearchResult {
  slug: string;
  title: string;
  score: number;
  postId?: string;
}

interface Props {
  lang?: 'zh-TW' | 'en';
}

export default function Search({ lang = 'zh-TW' }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEn = lang === 'en';
  const placeholder = isEn ? 'Semantic search...' : '語義搜尋技術知識...';
  const noResultsText = isEn ? 'No results found.' : '沒有找到相關結果。';
  const resultsLabel = isEn ? 'AI Semantic Results' : 'AI 語義搜尋結果';

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // ⌘K / Ctrl+K shortcut
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

  const postHref = (slug: string) => isEn ? `/en/posts/${slug}` : `/posts/${slug}`;

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

      {searched && !isSearching && (
        <div style={{ marginTop: '12px' }}>
          {results.length === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--label-secondary)', margin: '0', padding: '12px 0' }}>
              {noResultsText}
            </p>
          ) : (
            <>
              <p style={{ fontSize: '12px', color: 'var(--label-secondary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                {resultsLabel}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {results.map((res, i) => (
                  <a
                    key={i}
                    href={postHref(res.slug)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', borderRadius: '8px',
                      background: 'var(--bg-secondary)', border: '0.5px solid var(--separator)',
                      textDecoration: 'none', transition: 'background 0.15s',
                      gap: '12px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  >
                    <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--label)' }}>
                      {res.title}
                    </span>
                    <span style={{
                      fontSize: '12px', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0, fontWeight: 500,
                    }}>
                      {(res.score * 100).toFixed(0)}%
                    </span>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
