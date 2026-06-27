import React, { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  postId: string;
  lang?: 'zh-TW' | 'en';
}

function parseStreamPayload(payload: string): string {
  const trimmed = payload.trim();
  if (!trimmed || trimmed === '[DONE]') return '';
  try {
    const parsed = JSON.parse(trimmed);
    const delta = parsed?.choices?.[0]?.delta?.content;
    if (typeof delta === 'string') return delta;
    if (typeof parsed?.response === 'string') return parsed.response;
    if (typeof parsed?.text === 'string') return parsed.text;
    return '';
  } catch {
    return trimmed;
  }
}

export const AskThisPost: React.FC<Props> = ({ postId, lang = 'zh-TW' }) => {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [asked, setAsked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEn = lang === 'en';
  const title = isEn ? 'Ask this article' : '問這篇文章';
  const placeholder = isEn ? 'e.g. Does this work on Windows?' : '例如：這個解法在 Windows 上適用嗎？';
  const askLabel = isEn ? 'Ask' : '問';
  const hint = isEn ? 'Answers are based only on this article.' : 'AI 只根據這篇文章內容回答。';

  const examples = isEn
    ? ['Summarize the key takeaway', 'What are the tradeoffs?']
    : ['幫我總結重點', '這篇的取捨是什麼？'];

  const ask = useCallback(async (q: string) => {
    if (!q.trim() || isAsking) return;
    setIsAsking(true);
    setAsked(true);
    setAnswer('');

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, lang, postId }),
      });
      if (!res.ok) throw new Error(`Ask failed: ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) {
        setAnswer(await res.text());
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let streamMode: 'unknown' | 'text' | 'sse' = 'unknown';
      let finalAnswer = '';

      const flushEvent = (rawEvent: string) => {
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
      };

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
        let sep = buffer.indexOf('\n\n');
        while (sep !== -1) {
          const rawEvent = buffer.slice(0, sep).trim();
          buffer = buffer.slice(sep + 2);
          if (rawEvent) flushEvent(rawEvent);
          sep = buffer.indexOf('\n\n');
        }
      }
      if (streamMode === 'sse' && buffer.trim()) flushEvent(buffer.trim());

      if (!finalAnswer.trim()) {
        setAnswer(isEn ? 'No answer returned. Please try again.' : '沒有得到回答，請再試一次。');
      }
    } catch {
      setAnswer(isEn ? 'Something went wrong. Please try again.' : '出了點問題，請再試一次。');
    } finally {
      setIsAsking(false);
    }
  }, [isAsking, lang, postId, isEn]);

  return (
    <div className="ask-post">
      <div className="ask-head">
        <span className="ask-icon" aria-hidden>💬</span>
        <span className="ask-title">{title}</span>
      </div>

      <form
        className="ask-form"
        onSubmit={(e) => { e.preventDefault(); ask(query); }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="ask-input"
          disabled={isAsking}
        />
        <button type="submit" className="ask-btn" disabled={isAsking || !query.trim()}>
          {isAsking ? <span className="ask-spinner" /> : askLabel}
        </button>
      </form>

      {!asked && (
        <div className="ask-examples">
          {examples.map((ex) => (
            <button key={ex} type="button" className="ask-chip" onClick={() => { setQuery(ex); ask(ex); }}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {asked && (
        <div className="ask-answer">
          {answer ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <a href={href} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>{children}</a>
                ),
              }}
            >
              {answer}
            </ReactMarkdown>
          ) : (
            <span className="ask-thinking">{isEn ? 'Thinking…' : '思考中…'}</span>
          )}
        </div>
      )}

      <p className="ask-hint">{hint}</p>

      <style dangerouslySetInnerHTML={{ __html: `
        .ask-post {
          background: var(--bg-secondary);
          border: 0.5px solid var(--separator);
          border-radius: 12px;
          padding: 18px 20px;
          margin-top: 40px;
        }
        .ask-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .ask-icon { font-size: 15px; }
        .ask-title { font-size: 14px; font-weight: 700; color: var(--label); letter-spacing: -0.01em; }
        .ask-form { display: flex; gap: 8px; }
        .ask-input {
          flex: 1; min-width: 0;
          background: var(--bg); border: 0.5px solid var(--separator);
          border-radius: 8px; padding: 10px 12px; font-size: 14px; color: var(--label);
          outline: none; transition: border-color 0.15s;
        }
        .ask-input:focus { border-color: var(--accent); }
        .ask-input:disabled { opacity: 0.6; }
        .ask-btn {
          flex-shrink: 0; min-width: 52px;
          background: var(--accent); color: #fff; border: none; border-radius: 8px;
          padding: 0 16px; font-size: 14px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: filter 0.15s, transform 0.1s;
        }
        .ask-btn:hover:not(:disabled) { filter: brightness(1.08); }
        .ask-btn:active:not(:disabled) { transform: scale(0.96); }
        .ask-btn:disabled { opacity: 0.5; cursor: default; }
        .ask-spinner {
          width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff; border-radius: 50%; animation: ask-spin 0.8s linear infinite;
        }
        @keyframes ask-spin { to { transform: rotate(360deg); } }
        .ask-examples { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .ask-chip {
          background: transparent; border: 0.5px solid var(--separator); border-radius: var(--radius-full, 999px);
          padding: 5px 12px; font-size: 12.5px; color: var(--label-secondary); cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .ask-chip:hover { border-color: var(--accent); color: var(--accent); }
        .ask-answer {
          margin-top: 14px; padding: 14px 16px;
          background: var(--bg); border: 0.5px solid var(--separator); border-radius: 8px;
          font-size: 14.5px; line-height: 1.7; color: var(--label);
        }
        .ask-answer :global(p) { margin: 0 0 10px; }
        .ask-answer :global(p:last-child) { margin-bottom: 0; }
        .ask-answer :global(ul), .ask-answer :global(ol) { margin: 0 0 10px; padding-left: 1.3em; }
        .ask-answer :global(code) { background: var(--glass, rgba(127,127,127,0.12)); padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
        .ask-thinking { color: var(--label-tertiary); font-size: 14px; }
        .ask-hint { margin: 10px 0 0; font-size: 11.5px; color: var(--label-tertiary); }
      `}} />
    </div>
  );
};
