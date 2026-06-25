import { useState, useEffect, useRef } from 'react';
import { applyGlossary } from '../lib/applyGlossary';
import { findDefaultGlossaryEntry } from '../lib/glossary/terms';

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
  slug?: string;
}

interface ActiveCard {
  term: string;
  context: string;
  x: number;
  y: number;
}

type Level = 'beginner' | 'advanced';
interface Explain {
  definition?: string;
  context?: string;
  reading?: { label: string; url: string }[];
}

export function BilingualView({ enScript, zhScript, alignmentMap, slug = '' }: Props) {
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null);
  const [level, setLevel] = useState<Level>('beginner');
  const [data, setData] = useState<Explain | null>(null);
  const [loading, setLoading] = useState(false);
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
      // Only handle glosses inside this component's EN column so we don't
      // collide with the article's own (.prose) glossary handler.
      const gloss = target.closest('.gloss') as HTMLElement | null;
      if (gloss && enColRef.current?.contains(gloss)) {
        const rect = gloss.getBoundingClientRect();
        const term = gloss.dataset.term ?? gloss.textContent?.toLowerCase() ?? '';
        const context = (gloss.closest('p, li, blockquote')?.textContent ?? '').slice(0, 400);
        setLevel('beginner');
        setData(null);
        setActiveCard({
          term,
          context,
          x: Math.min(rect.left, window.innerWidth - 332),
          y: Math.min(rect.bottom + 8, window.innerHeight - 240),
        });
        e.stopPropagation();
        return;
      }
      if (!target.closest('.gloss-card')) setActiveCard(null);
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

  // Fetch explanation whenever the active term or level changes.
  useEffect(() => {
    if (!activeCard) return;
    let cancelled = false;
    setLoading(true);
    const seed = findDefaultGlossaryEntry(activeCard.term);
    fetch('/api/glossary/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term: activeCard.term, slug, lang: 'en', level, context: activeCard.context, seed }),
    })
      .then(res => res.json())
      .then((res: Explain) => { if (!cancelled) { setData(res); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeCard, level, slug]);

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

      {activeCard && (
        <div
          className="gloss-card"
          style={{ position: 'fixed', top: activeCard.y, left: activeCard.x }}
          onClick={e => e.stopPropagation()}
        >
          <div className="gloss-card-head">
            <span className="gloss-card-term">{activeCard.term}</span>
            <div className="gloss-card-levels">
              <button type="button" className={level === 'beginner' ? 'active' : ''} onClick={() => setLevel('beginner')}>Basic</button>
              <button type="button" className={level === 'advanced' ? 'active' : ''} onClick={() => setLevel('advanced')}>Deep</button>
            </div>
          </div>
          <div className="gloss-card-body">
            <p className="gloss-card-def">{loading || !data ? 'Loading…' : data.definition}</p>
            {data?.context && <p className="gloss-card-context">{data.context}</p>}
            {data?.reading && data.reading.length > 0 && (
              <div className="gloss-card-reading">
                {data.reading.map((link, i) => (
                  <a key={i} href={link.url}>{link.label}</a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
