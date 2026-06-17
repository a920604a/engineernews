import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatWidget from './ChatWidget';

interface Props {
  lang: 'zh-TW' | 'en';
}

const BTN_SIZE = 52;
const POPUP_W = 360;
const POPUP_H = 520;
const POPUP_GAP = 12;

function useDraggable(size: { w: number; h: number }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const offsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const didDragRef = useRef(false);
  const elRef = useRef<HTMLElement>(null);

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

  return { pos, setPos, didDragRef, elRef, onPointerDown, onPointerMove, onPointerUp };
}

export default function ChatFloating({ lang }: Props) {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleBtnPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    btn.onPointerUp(e);
    // Toggle only on click (not drag)
    if (!btn.didDragRef.current) setIsOpen((prev) => !prev);
  };

  // Popup opens near the button unless user has dragged popup independently
  const getPopupPos = (): React.CSSProperties => {
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
    : { position: 'fixed', bottom: '32px', right: '32px' };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(0,0,0,0.25)',
          }}
        />
      )}

      {/* Popup */}
      <div
        style={{
          ...getPopupPos(),
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
        {/* Popup drag handle */}
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

      {/* Draggable floating button */}
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
