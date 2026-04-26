import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action: () => void;
  type?: 'command' | 'search-result';
  url?: string;
}

export default function CommandCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [searchResults, setSearchResults] = useState<Command[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pagefindRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      loadPagefind();
    }
  }, [isOpen]);

  const loadPagefind = async () => {
    if (pagefindRef.current) return;
    try {
      const pagefindPath = '/pagefind/pagefind.js';
      // @ts-ignore
      pagefindRef.current = await import(/* @vite-ignore */ pagefindPath);
      await pagefindRef.current.init();
    } catch (e) {
      console.error('Failed to load pagefind', e);
    }
  };

  useEffect(() => {
    const search = async () => {
      if (!query.trim() || !pagefindRef.current) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const search = await pagefindRef.current.search(query);
        const results = await Promise.all(search.results.slice(0, 5).map(async (r: any) => {
          const data = await r.data();
          return {
            id: r.id,
            title: data.meta.title,
            subtitle: data.excerpt.replace(/<[^>]*>/g, '').slice(0, 60) + '...',
            action: () => window.location.href = data.url,
            type: 'search-result',
            url: data.url
          } as Command;
        }));
        setSearchResults(results);
        setSelectedIndex(0);
      } catch (e) {
        console.error('Search failed', e);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(search, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const commands: Command[] = [
    { id: 'home', title: '回首頁', subtitle: '跳轉至工程師新聞首頁', action: () => window.location.href = '/', type: 'command' },
    { id: 'cats', title: '瀏覽分類', subtitle: '查看技術、產品、學習等分類', action: () => window.location.href = '/categories', type: 'command' },
    { id: 'projs', title: '專案展示', subtitle: '查看過往的開發案例', action: () => window.location.href = '/projects', type: 'command' },
  ];

  const filteredCommands = commands.filter(c => 
    c.title.toLowerCase().includes(query.toLowerCase()) || 
    c.subtitle?.toLowerCase().includes(query.toLowerCase())
  );

  const allItems = [...filteredCommands, ...searchResults];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      allItems[selectedIndex]?.action();
      setIsOpen(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      {createPortal(
        <div className={`cc-overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)}>
          <div className="cc-modal" onClick={e => e.stopPropagation()}>
            <div className="cc-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="cc-search-icon">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="cc-input"
                placeholder="輸入指令或搜尋內容..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <kbd className="cc-esc">ESC</kbd>
            </div>

            <div className="cc-body">
              {allItems.length > 0 ? (
                <div className="cc-section">
                  <div className="cc-section-title">
                    {query.trim() ? '搜尋結果與指令' : '快速指令'}
                  </div>
                  {allItems.map((item, i) => (
                    <div
                      key={item.id}
                      className={`cc-item ${i === selectedIndex ? 'selected' : ''}`}
                      onMouseEnter={() => setSelectedIndex(i)}
                      onClick={() => { item.action(); setIsOpen(false); }}
                    >
                      <div className="cc-item-content">
                        <div className="cc-item-title">
                          {item.title}
                          {item.type === 'search-result' && <span className="cc-item-tag">文章</span>}
                        </div>
                        {item.subtitle && <div className="cc-item-subtitle">{item.subtitle}</div>}
                      </div>
                      {i === selectedIndex && <div className="cc-item-enter">ENTER</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cc-empty">
                  {isSearching ? '搜尋中...' : '沒有找到相關指令或內容'}
                </div>
              )}
            </div>
            
            <div className="cc-footer">
              <div className="cc-help">
                <span><kbd>↑↓</kbd> 選擇</span>
                <span><kbd>↵</kbd> 執行</span>
                <span><kbd>⌘K</kbd> 切換</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .cc-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          justify-content: center;
          padding-top: 15vh;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        .cc-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }
        .cc-modal {
          width: 100%;
          max-width: 600px;
          background: var(--bg-secondary);
          border: 0.5px solid var(--separator);
          border-radius: 14px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform: translateY(-20px) scale(0.98);
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cc-overlay.open .cc-modal {
          transform: translateY(0) scale(1);
        }
        .cc-header {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 0.5px solid var(--separator);
        }
        .cc-search-icon { color: var(--accent); }
        .cc-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--label);
          font-size: 16px;
          outline: none;
        }
        .cc-esc {
          font-size: 10px;
          color: var(--label-tertiary);
          padding: 2px 6px;
          border: 0.5px solid var(--separator);
          border-radius: 4px;
        }
        .cc-body {
          max-height: 400px;
          overflow-y: auto;
          padding: 8px;
        }
        .cc-section-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--label-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 12px 12px 6px;
        }
        .cc-item {
          padding: 10px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: background 0.1s;
        }
        .cc-item.selected {
          background: var(--accent);
        }
        .cc-item.selected .cc-item-title,
        .cc-item.selected .cc-item-subtitle {
          color: #fff;
        }
        .cc-item-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--label);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cc-item-tag {
          font-size: 9px;
          font-weight: 700;
          color: var(--accent);
          background: rgba(10, 132, 255, 0.1);
          padding: 1px 5px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .cc-item.selected .cc-item-tag {
          color: #fff;
          background: rgba(255, 255, 255, 0.2);
        }
        .cc-item-subtitle {
          font-size: 12px;
          color: var(--label-secondary);
        }
        .cc-item-enter {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.8);
          padding: 2px 6px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }
        .cc-empty {
          padding: 40px;
          text-align: center;
          color: var(--label-tertiary);
          font-size: 14px;
        }
        .cc-footer {
          padding: 12px 20px;
          background: var(--bg-tertiary);
          border-top: 0.5px solid var(--separator);
        }
        .cc-help {
          display: flex;
          gap: 16px;
          font-size: 11px;
          color: var(--label-tertiary);
        }
        .cc-help kbd {
          background: var(--bg-secondary);
          color: var(--label-secondary);
          padding: 1px 4px;
          border-radius: 3px;
          margin-right: 4px;
          font-family: monospace;
        }
      `}</style>
    </>
  );
}
