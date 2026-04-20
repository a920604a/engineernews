import React, { useState } from 'react';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setIsSearching(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setResults(data.results || []);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ marginBottom: '40px' }}>
      <form onSubmit={handleSearch} style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋技術決策與知識..."
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '0.5px solid var(--separator)',
            background: 'var(--secondary-bg)',
            color: 'var(--label-primary)',
            fontSize: '16px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        {isSearching && (
          <div style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '12px', color: 'var(--label-secondary)' }}>
            正在搜尋...
          </div>
        )}
      </form>

      {results.length > 0 && (
        <div className="card" style={{ marginTop: '16px', padding: '12px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--label-secondary)', marginBottom: '12px' }}>AI 語義搜尋結果：</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {results.map((res: any, i) => (
              <li key={i} style={{ marginBottom: '12px' }}>
                <a href={`/posts/${res.slug}`} style={{ fontSize: '16px', fontWeight: '500', color: 'var(--accent-color)' }}>
                  {res.title}
                </a>
                <div style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>
                  相似度: {(res.score * 100).toFixed(1)}%
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
