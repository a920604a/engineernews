import { useState, useEffect } from 'react';
import { glossary } from '../data/glossary';

interface Props {
  hasZh: boolean;
}

let glossaryApplied = false;

function applyGlossary() {
  if (glossaryApplied) return;
  const enCol = document.querySelector('.en-col .prose');
  if (!enCol) return;

  const keys = Object.keys(glossary).sort((a, b) => b.length - a.length);
  const escapedKeys = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escapedKeys.join('|')})\\b`, 'gi');

  const markedTerms = new Set<string>();

  const walker = document.createTreeWalker(
    enCol,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest('code, pre, a, h1, h2, h3, h4, h5, h6, .gloss')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const nodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    nodes.push(node);
  }

  for (const textNode of nodes) {
    const text = textNode.textContent ?? '';
    regex.lastIndex = 0;
    if (!regex.test(text)) continue;
    regex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const term = match[0].toLowerCase();
      const def = glossary[term];
      if (!def) continue;

      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      if (!markedTerms.has(term)) {
        markedTerms.add(term);
        const span = document.createElement('span');
        span.className = 'gloss';
        span.dataset.def = def;
        span.textContent = match[0];
        fragment.appendChild(span);
      } else {
        fragment.appendChild(document.createTextNode(match[0]));
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    if (fragment.childNodes.length > 0) {
      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  }

  glossaryApplied = true;
}

export function ReadingModeBar({ hasZh }: Props) {
  const [bilingual, setBilingual] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1140);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    applyGlossary();
  }, []);

  useEffect(() => {
    const grid = document.querySelector('.article-grid');
    grid?.classList.toggle('bilingual-on', bilingual);
  }, [bilingual]);

  const bilingualDisabled = !hasZh || isMobile;
  const bilingualTitle = !hasZh
    ? 'No Chinese version available'
    : isMobile
    ? 'Available on larger screens'
    : 'Toggle bilingual view';

  return (
    <div className="reading-mode-bar">
      <button
        className={`rm-btn${bilingual ? ' active' : ''}`}
        onClick={() => !bilingualDisabled && setBilingual(b => !b)}
        disabled={bilingualDisabled}
        title={bilingualTitle}
        aria-pressed={bilingual}
      >
        ⇄ Bilingual
      </button>
    </div>
  );
}
