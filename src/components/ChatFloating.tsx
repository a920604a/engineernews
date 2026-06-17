import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatWidget from './ChatWidget';

interface Props {
  lang: 'zh-TW' | 'en';
}

const BTN_SIZE = 52;
const POPUP_W = 360;
const POPUP_H = 520;
const POPUP_GAP = 12;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

function useDraggable(size: { w: number; h: number }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const offsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const didDragRef = useRef(false);

  const clamp = (x: number, y: number) => ({
    x: Math.max(0, Math.min(x, window.innerWidth - size.w)),
    y: Math.max(0, Math.min(y, window.innerHeight - size.h)),
  });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    offsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    didDragRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!offsetRef.current) return;
    const { dx, dy } = offsetRef.current;
    const newX = e.clientX - dx;
    const newY = e.clientY - dy;
    const prev = pos ?? { x: 0, y: 0 };
    if (!didDragRef.current && Math.hypot(newX - prev.x, newY - prev.y) > 5) {
      didDragRef.current = true;
    }
    if (didDragRef.current) setPos(clamp(newX, newY));
  }, [pos]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    offsetRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  return { pos, didDragRef, onPointerDown, onPointerMove, onPointerUp };
}

export default function ChatFloating({ lang }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const close = useCallback(() => setIsOpen(false), []);

  const btn = useDraggable({ w: BTN_SIZE, h: BTN_SIZE });
  const popup = useDraggable({ w: POPUP_W, h: POPUP_H });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  // Close sheet when switching to desktop to avoid stale layout
  useEffect(() => {
    if (!isMobile && isOpen) close();
  }, [isMobile]);

  const handleBtnPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    btn.onPointerUp(e);
    if (!btn.didDragRef.current) setIsOpen((prev) => !prev);
  };

  // Desktop: popup position relative to button
  const getDesktopPopupPos = (): React.CSSProperties => {
    if (popup.pos) {
      return { position: 'fixed', left: popup.pos.x, top: popup.pos.y };
    }
    if (btn.pos) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const openAbove = btn.pos.y + BTN_SIZE + POPUP_GAP + POPUP_H > vh;
      const top = openAbove
        ? btn.pos.y - POPUP_H - POPUP_GAP
        : btn.pos.y + BTN_SIZE + POPUP_GAP;
      const left = Math.max(0, Math.min(btn.pos.x + BTN_SIZE - POPUP_W, vw - POPUP_W));
      return { position: 'fixed', top, left };
    }
    return { position: 'fixed', bottom: '100px', right: '32px' };
  };

  const btnStyle: React.CSSProperties = btn.pos
    ? { position: 'fixed', left: btn.pos.x, top: btn.pos.y }
    : {
        position: 'fixed',
        bottom: isMobile
          ? 'calc(32px + env(safe-area-inset-bottom, 0px))'
          : '32px',
        right: '32px',
      };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(0,0,0,0.4)',
          }}
        />
      )}

      {isMobile ? (
        /* ── Mobile: Bottom Sheet ── */
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '85dvh',
            zIndex: 9999,
            borderRadius: '20px 20px 0 0',
            border: '0.5px solid var(--separator)',
            boxShadow: '0 -4px 32px rgba(0,0,0,0.2)',
            background: 'var(--bg-primary, #fff)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none',
            transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
            transition: 'opacity 0.25s ease, transform 0.3s cubic-bezier(0.32,0.72,0,1)',
            // Avoid content being hidden behind Home Indicator
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {/* Sheet handle — tap to close */}
          <div
            onClick={close}
            style={{
              height: '36px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '40px', height: '4px',
              borderRadius: '2px',
              background: 'var(--text-tertiary, #ccc)',
            }} />
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            {isOpen && <ChatWidget lang={lang} onClose={close} />}
          </div>
        </div>
      ) : (
        /* ── Desktop: Draggable Floating Popup ── */
        <div
          style={{
            ...getDesktopPopupPos(),
            width: POPUP_W,
            height: POPUP_H,
            zIndex: 9999,
            borderRadius: '16px',
            border: '0.5px solid var(--separator)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none',
            transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            transformOrigin: 'bottom right',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Desktop drag handle */}
          <div
            onPointerDown={popup.onPointerDown}
            onPointerMove={popup.onPointerMove}
            onPointerUp={popup.onPointerUp}
            style={{
              height: '28px',
              flexShrink: 0,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-secondary, rgba(0,0,0,0.04))',
              borderBottom: '0.5px solid var(--separator)',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            <div style={{
              width: '36px', height: '4px',
              borderRadius: '2px',
              background: 'var(--text-tertiary, #bbb)',
            }} />
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            {isOpen && <ChatWidget lang={lang} onClose={close} />}
          </div>
        </div>
      )}

      {/* Draggable floating button — both mobile & desktop */}
      <button
        onPointerDown={btn.onPointerDown}
        onPointerMove={btn.onPointerMove}
        onPointerUp={handleBtnPointerUp}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={isOpen}
        style={{
          ...btnStyle,
          zIndex: 9999,
          width: BTN_SIZE,
          height: BTN_SIZE,
          borderRadius: '50%',
          background: 'var(--accent)',
          border: 'none',
          cursor: 'grab',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          transition: 'box-shadow 0.2s ease',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  );
}
