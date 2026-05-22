import { useState, useEffect, useRef } from 'react';
import { glossary } from '../data/glossary';

interface BilingualPair {
  en: number | number[];
  zh: number | number[];
}

interface AlignmentMap {
  pairs: BilingualPair[];
}

interface Props {
  enScript: string;
  zhScript: string;
  alignmentMap: AlignmentMap | null;
}

interface ActiveCard {
  term: string;
  x: number;
  y: number;
}

function applyGlossary(container: HTMLElement): void {
  const keys = Object.keys(glossary).sort((a, b) => b.length - a.length);
  const escapedKeys = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escapedKeys.join('|')})\\b`, 'gi');
  const markedTerms = new Set<string>();

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('code, pre, a, h1, h2, h3, h4, h5, h6, .gloss')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) nodes.push(node);

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
      const entry = glossary[term];
      if (!entry) continue;

      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      if (!markedTerms.has(term)) {
        markedTerms.add(term);
        const span = document.createElement('span');
        span.className = 'gloss';
        span.dataset.def = entry.zh;
        span.dataset.term = term;
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
}

export function BilingualView({ enScript, zhScript, alignmentMap }: Props) {
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null);
  const enColRef = useRef<HTMLDivElement>(null);
  const glossaryApplied = useRef(false);

  const enParas = enScript.split('\n\n').filter(p => p.trim());
  const zhParas = zhScript.split('\n\n').filter(p => p.trim());

  // Build EN → ZH lookup
  const enToZh = new Map<number, number[]>();
  if (alignmentMap) {
    for (const pair of alignmentMap.pairs) {
      const enIndices = Array.isArray(pair.en) ? pair.en : [pair.en];
      const zhIndices = Array.isArray(pair.zh) ? pair.zh : [pair.zh];
      for (const ei of enIndices) {
        enToZh.set(ei, [...(enToZh.get(ei) ?? []), ...zhIndices]);
      }
    }
  }

  useEffect(() => {
    if (!glossaryApplied.current && enColRef.current) {
      applyGlossary(enColRef.current);
      glossaryApplied.current = true;
    }
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const gloss = target.closest('.gloss') as HTMLElement | null;
      if (gloss) {
        const rect = gloss.getBoundingClientRect();
        const term = gloss.dataset.term ?? gloss.textContent?.toLowerCase() ?? '';
        setActiveCard({
          term,
          x: Math.min(rect.left, window.innerWidth - 320),
          y: Math.min(rect.bottom + 8, window.innerHeight - 160),
        });
        e.stopPropagation();
        return;
      }
      setActiveCard(null);
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') setActiveCard(null);
    }

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  function handleEnHover(idx: number) {
    document.querySelectorAll<HTMLElement>('.para-card.zh-highlight').forEach(el =>
      el.classList.remove('zh-highlight')
    );
    for (const zi of enToZh.get(idx) ?? []) {
      document.querySelector(`[data-zh-idx="${zi}"]`)?.classList.add('zh-highlight');
    }
  }

  function handleEnLeave() {
    document.querySelectorAll<HTMLElement>('.para-card.zh-highlight').forEach(el =>
      el.classList.remove('zh-highlight')
    );
  }

  const activeEntry = activeCard ? glossary[activeCard.term] : null;

  return (
    <div className="bilingual-cols">
      <div className="bilingual-en-col">
        <p className="bilingual-col-header">🇺🇸 English</p>
        <div ref={enColRef} className="para-cards">
          {enParas.map((para, i) => (
            <p
              key={i}
              className="para-card"
              data-en-idx={i}
              onMouseEnter={() => handleEnHover(i)}
              onMouseLeave={handleEnLeave}
            >
              {para}
            </p>
          ))}
        </div>
      </div>

      <div className="bilingual-zh-col">
        <p className="bilingual-col-header">🇹🇼 中文</p>
        <div className="para-cards">
          {zhParas.map((para, i) => (
            <p key={i} className="para-card" data-zh-idx={i}>
              {para}
            </p>
          ))}
        </div>
      </div>

      {activeCard && activeEntry && (
        <div
          className="gloss-card"
          style={{ position: 'fixed', top: activeCard.y, left: activeCard.x }}
          onClick={e => e.stopPropagation()}
        >
          <p className="gloss-card-term">{activeCard.term}</p>
          <p className="gloss-card-zh">{activeEntry.zh}</p>
          {activeEntry.context && (
            <p className="gloss-card-context">{activeEntry.context}</p>
          )}
        </div>
      )}
    </div>
  );
}
