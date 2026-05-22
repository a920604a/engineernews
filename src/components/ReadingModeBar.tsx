import { useState, useEffect } from 'react';

interface Props {
  hasZh: boolean;
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
