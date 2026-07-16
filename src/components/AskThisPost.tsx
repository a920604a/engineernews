import React from 'react';
import type { OpenChatDetail } from './ChatFloating';

interface Props {
  postId: string;
  lang?: 'zh-TW' | 'en';
}

function openChat(detail: OpenChatDetail) {
  window.dispatchEvent(new CustomEvent<OpenChatDetail>('open-chat', { detail }));
}

export const AskThisPost: React.FC<Props> = ({ postId, lang = 'zh-TW' }) => {
  const isEn = lang === 'en';
  const title = isEn ? 'Ask this article' : '問這篇文章';
  const hint = isEn
    ? 'Answers come from this article only. Click any prompt below or open the chat at the bottom right.'
    : 'AI 只根據這篇文章內容回答。點下方任一問題，或直接開右下對話框。';
  const openLabel = isEn ? 'Open chat →' : '開啟對話 →';

  const examples = isEn
    ? ['Summarize the key takeaway', 'What are the tradeoffs?', 'Real-world use cases?']
    : ['幫我總結重點', '這篇的取捨是什麼？', '有什麼實際應用場景？'];

  return (
    <div className="ask-post">
      <div className="ask-head">
        <span className="ask-icon" aria-hidden>💬</span>
        <span className="ask-title">{title}</span>
      </div>

      <p className="ask-hint">{hint}</p>

      <div className="ask-examples">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            className="ask-chip"
            onClick={() => openChat({ postId, query: ex, scope: 'post' })}
          >
            {ex}
          </button>
        ))}
        <button
          type="button"
          className="ask-chip ask-chip-primary"
          onClick={() => openChat({ postId, scope: 'post' })}
        >
          {openLabel}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .ask-post {
          background: var(--bg-secondary);
          border: 0.5px solid var(--separator);
          border-radius: 12px;
          padding: 18px 20px;
          margin-top: 40px;
        }
        .ask-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .ask-icon { font-size: 15px; }
        .ask-title { font-size: 14px; font-weight: 700; color: var(--label); letter-spacing: -0.01em; }
        .ask-hint { margin: 0 0 14px; font-size: 12.5px; color: var(--label-tertiary); line-height: 1.5; }
        .ask-examples { display: flex; flex-wrap: wrap; gap: 8px; }
        .ask-chip {
          background: transparent; border: 0.5px solid var(--separator); border-radius: 999px;
          padding: 6px 14px; font-size: 13px; color: var(--label-secondary); cursor: pointer;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .ask-chip:hover { border-color: var(--accent); color: var(--accent); }
        .ask-chip-primary {
          border-color: var(--accent); color: var(--accent); font-weight: 600;
        }
        .ask-chip-primary:hover { background: var(--accent); color: #fff; }
      `}} />
    </div>
  );
};
