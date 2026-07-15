import React, { useState, useEffect, useRef } from 'react';

function processTextForTTS(title: string, tldr: string, content: string): string {
  let processed = `您好，歡迎收聽 Engineer News。今天為您導讀的文章標題是：${title}。\n`;
  if (tldr) processed += `本篇摘要：${tldr}。\n`;
  processed += `導讀開始。\n\n`;

  const mainContent = content.replace(/^---[\s\S]*?---\n*/, '');
  const sections = mainContent.split(/\n(?=#{1,6}\s)/);

  for (const section of sections) {
    const headerMatch = section.match(/^(#{1,6})\s+(.*)/);
    if (headerMatch) processed += `\n章節標題：${headerMatch[2]}。\n`;

    let body = section.replace(/^#{1,6}\s+.*?\n/, '');
    body = body.replace(/!\[[^\]]*\]\([^\)]+\)/g, '');
    body = body.replace(/<img[^>]*>/gi, '');
    body = body.replace(/```[\s\S]*?```/g, '\n此處有程式碼範例，已跳過詳細內容。\n');
    body = body.replace(/`([^`]+)`/g, '$1');
    body = body.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    body = body.replace(/[\*_]{1,3}([^\*_]+)[\*_]{1,3}/g, '$1');
    body = body.replace(/<[^>]*>/g, '');
    processed += body;
  }

  processed += `\n\n以上是文章「${title}」的導讀內容。感謝您的收聽，我們下次見。`;
  return processed.trim();
}

interface TTSPlayerProps {
  title: string;
  tldr?: string;
  content: string;
  initialAudioUrl?: string;
  initialSrtUrl?: string;
  compact?: boolean;
}

export const TTSPlayer: React.FC<TTSPlayerProps> = ({
  title,
  tldr,
  content,
  initialAudioUrl,
  initialSrtUrl,
  compact = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverLeft, setHoverLeft] = useState(0);

  const SPEED_MIN = 0.5;
  const SPEED_MAX = 2.0;
  const adjustSpeed = (delta: number) => {
    const next = Math.round((playbackSpeed + delta) * 10) / 10;
    setPlaybackSpeed(Math.min(SPEED_MAX, Math.max(SPEED_MIN, next)));
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── 播放埋點（a）：量播放率 / 完播率，驗證語音導讀有沒有人用 ──────────
  const firedPlayRef = useRef(false);
  const firedMilestonesRef = useRef<Set<number>>(new Set());
  const firedCompleteRef = useRef(false);

  const getSessionId = (): string => {
    try {
      let sid = sessionStorage.getItem('tts_sid');
      if (!sid) {
        sid = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        sessionStorage.setItem('tts_sid', sid);
      }
      return sid;
    } catch {
      return 'anon';
    }
  };

  const sendAudioEvent = (event: 'play' | 'progress' | 'complete', milestone?: number) => {
    try {
      const slug = location.pathname.split('/').filter(Boolean).pop() ?? '';
      if (!slug) return;
      const lang = location.pathname.startsWith('/en/') ? 'en' : 'zh-TW';
      const body = JSON.stringify({ slug, lang, event, milestone, session_id: getSessionId() });
      // 火後不理，優先用 sendBeacon（離頁也送得出去）
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/audio-events', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/audio-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
      }
    } catch {}
  };

  const handlePlay = () => {
    setIsPlaying(true);
    if (!firedPlayRef.current) {
      firedPlayRef.current = true;
      sendAudioEvent('play');
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (!firedCompleteRef.current) {
      firedCompleteRef.current = true;
      sendAudioEvent('complete');
    }
    // 聽完整個 mp3 視為完成一次閱讀，通知頁面計數 script
    window.dispatchEvent(new CustomEvent('tts:ended'));
  };

  useEffect(() => {
    if (initialAudioUrl) {
      setIsVisible(true);
    } else {
      const slug = location.pathname.split('/').filter(Boolean).pop() ?? '';
      if (slug) {
        fetch(`/api/tts/audio-url?slug=${encodeURIComponent(slug)}`)
          .then(r => r.json() as Promise<{ audio_url: string | null }>)
          .then(({ audio_url }) => {
            if (audio_url) {
              setAudioUrl(audio_url);
              setIsVisible(true);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    if (audioUrl && isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [audioUrl]);

  const handleSynthesize = async () => {
    setIsLoading(true);
    const slug = location.pathname.split('/').filter(Boolean).pop() ?? '';
    const ttsText = processTextForTTS(title, tldr || '', content);

    if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/mpeg')) {
      const ms = new MediaSource();
      const objectUrl = URL.createObjectURL(ms);
      setAudioUrl(objectUrl);

      ms.addEventListener('sourceopen', async () => {
        const sb = ms.addSourceBuffer('audio/mpeg');
        const chunks: Uint8Array[] = [];

        try {
          const res = await fetch('/api/tts/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: ttsText }),
          });
          if (!res.ok || !res.body) throw new Error(`合成失敗 (${res.status})`);

          setIsLoading(false);
          setIsPlaying(true);

          const reader = res.body.getReader();
          const appendNext = async () => {
            const { done, value } = await reader.read();
            if (done) {
              if (!sb.updating) ms.endOfStream();
              else sb.addEventListener('updateend', () => ms.endOfStream(), { once: true });

              fetch(`/api/tts/cache`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: ttsText, slug }),
              }).then(async r => {
                if (r.ok) {
                  const data = await r.json() as { audio_url: string };
                  setAudioUrl(data.audio_url);
                  URL.revokeObjectURL(objectUrl);
                  if (slug) fetch('/api/tts/update-audio', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slug, audio_url: data.audio_url }),
                  }).catch(() => {});
                }
              }).catch(() => {});
              return;
            }
            chunks.push(value);
            if (sb.updating) {
              sb.addEventListener('updateend', () => { sb.appendBuffer(value); appendNext(); }, { once: true });
            } else {
              sb.appendBuffer(value);
              sb.addEventListener('updateend', appendNext, { once: true });
            }
          };
          appendNext();
        } catch (e) {
          setIsLoading(false);
          setTtsError('語音服務暫時不可用，請稍後再試');
        }
      }, { once: true });

    } else {
      try {
        const res = await fetch('/api/tts/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: ttsText }),
        });
        if (!res.ok) throw new Error(`合成失敗 (${res.status})`);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
        setIsPlaying(true);
        fetch(`/api/tts/cache`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: ttsText, slug }),
        }).then(async r => {
          if (r.ok) {
            const data = await r.json() as { audio_url: string };
            setAudioUrl(data.audio_url);
            URL.revokeObjectURL(objectUrl);
            if (slug) fetch('/api/tts/update-audio', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug, audio_url: data.audio_url }),
            }).catch(() => {});
          }
        }).catch(() => {});
      } catch (e) {
        setTtsError('語音服務暫時不可用，請稍後再試');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAudioError = () => {
    setIsPlaying(false);
    setAudioUrl('');
    setTtsError('音檔無法載入，點擊播放鍵重新合成');
  };

  const togglePlay = () => {
    if (!audioUrl) {
      handleSynthesize();
      return;
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
          setTtsError('音檔無法播放，請重新整理或重新合成');
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      setCurrentTime(current);
      setDuration(dur);
      const pct = (current / dur) * 100;
      setProgress(pct);

      // 埋點：跨過 25 / 50 / 75% 各送一次 progress（用來看中途流失）
      if (dur > 0) {
        for (const m of [25, 50, 75]) {
          if (pct >= m && !firedMilestonesRef.current.has(m)) {
            firedMilestonesRef.current.add(m);
            sendAudioEvent('progress', m);
          }
        }
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = (parseFloat(e.target.value) / 100) * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setProgress(parseFloat(e.target.value));
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTrackHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(ratio * duration);
    setHoverLeft(ratio * rect.width);
  };
  const handleTrackLeave = () => setHoverTime(null);

  const SpeedStepper: React.FC<{ compact?: boolean }> = ({ compact: c }) => (
    <div className={`speed-stepper ${c ? 'speed-stepper-mini' : ''}`}>
      <button
        type="button"
        onClick={() => adjustSpeed(-0.1)}
        disabled={playbackSpeed <= SPEED_MIN + 1e-6}
        aria-label="降低速度"
      >−</button>
      <span className="speed-stepper-value">{playbackSpeed.toFixed(1)}×</span>
      <button
        type="button"
        onClick={() => adjustSpeed(0.1)}
        disabled={playbackSpeed >= SPEED_MAX - 1e-6}
        aria-label="提高速度"
      >+</button>
    </div>
  );

  if (!isVisible) return null;

  // ── Compact mini bar (mobile fixed bottom) ──────────────────────────
  if (compact) {
    return (
      <div className="tts-mini-bar">
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className={`tts-mini-play ${isPlaying ? 'active' : ''}`}
          aria-label={isPlaying ? '暫停' : '播放'}
        >
          {isLoading ? (
            <div className="tts-mini-spinner" />
          ) : isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        <div className="tts-mini-track">
          <span className="tts-mini-title">{title}</span>
          <div
            className="tts-track-wrapper"
            onMouseMove={handleTrackHover}
            onMouseLeave={handleTrackLeave}
          >
            {hoverTime !== null && (
              <div className="tts-hover-tip" style={{ left: `${hoverLeft}px` }}>
                {formatTime(hoverTime)}
              </div>
            )}
            <input
              type="range"
              min="0" max="100" step="0.1"
              value={progress || 0}
              onChange={handleSeek}
              className="tts-mini-range"
              style={{ '--progress': `${progress}%` } as React.CSSProperties}
            />
          </div>
        </div>

        <span className="tts-mini-time">{formatTime(currentTime)}</span>

        <SpeedStepper compact />

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onLoadedMetadata={handleTimeUpdate}
            onPlay={handlePlay}
            onPause={() => setIsPlaying(false)}
            onError={handleAudioError}
          />
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          .tts-mini-bar {
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
            display: flex; align-items: center; gap: 10px;
            padding: 0 16px; height: 60px;
            background: var(--bg-secondary);
            border-top: 0.5px solid var(--separator);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 -4px 24px rgba(0,0,0,0.12);
          }
          @media (min-width: 1140px) { .tts-mini-bar { display: none; } }
          .tts-mini-play {
            width: 36px; height: 36px; border-radius: 50%; border: none; flex-shrink: 0;
            background: var(--accent); color: white; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.15s ease;
          }
          .tts-mini-play:hover { transform: scale(1.08); }
          .tts-mini-play.active { background: var(--label); }
          .tts-mini-play:disabled { opacity: 0.6; }
          .tts-mini-spinner {
            width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white; border-radius: 50%;
            animation: tts-spin 0.8s linear infinite;
          }
          @keyframes tts-spin { to { transform: rotate(360deg); } }
          .tts-mini-track { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
          .tts-mini-title {
            font-size: 12px; font-weight: 600; color: var(--label);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          }
          .tts-mini-range {
            -webkit-appearance: none; width: 100%; height: 3px;
            background: var(--separator); border-radius: 2px; outline: none; cursor: pointer;
          }
          .tts-mini-range::-webkit-slider-runnable-track {
            height: 3px; border-radius: 2px;
            background: linear-gradient(to right, var(--accent) var(--progress), transparent var(--progress));
          }
          .tts-mini-range::-webkit-slider-thumb {
            -webkit-appearance: none; height: 10px; width: 10px; border-radius: 50%;
            background: var(--accent); margin-top: -3.5px;
          }
          .tts-mini-time {
            font-size: 11px; font-weight: 600; color: var(--label-tertiary);
            font-variant-numeric: tabular-nums; flex-shrink: 0;
          }
          .tts-track-wrapper { position: relative; width: 100%; }
          .tts-hover-tip {
            position: absolute; bottom: 100%; transform: translateX(-50%);
            margin-bottom: 6px; padding: 2px 6px; font-size: 10px; font-weight: 600;
            background: var(--label); color: var(--bg-primary);
            border-radius: 4px; pointer-events: none; white-space: nowrap;
            font-variant-numeric: tabular-nums; z-index: 5;
          }
          @media (hover: none), (pointer: coarse) { .tts-hover-tip { display: none; } }
          .speed-stepper {
            display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0;
            border: 0.5px solid var(--separator); border-radius: 6px;
            padding: 2px 4px; background: transparent;
          }
          .speed-stepper button {
            width: 20px; height: 20px; border: none; background: transparent;
            color: var(--label-secondary); cursor: pointer; padding: 0;
            display: inline-flex; align-items: center; justify-content: center;
            font-size: 14px; font-weight: 600; line-height: 1; border-radius: 4px;
          }
          .speed-stepper button:not(:disabled):hover { background: var(--fill-secondary); color: var(--label); }
          .speed-stepper button:disabled { opacity: 0.3; cursor: default; }
          .speed-stepper-value {
            font-size: 11px; font-weight: 600; color: var(--label);
            font-variant-numeric: tabular-nums; min-width: 32px; text-align: center;
          }
          .speed-stepper-mini .speed-stepper-value { min-width: 28px; font-size: 10px; }
          .speed-stepper-mini button { width: 18px; height: 18px; font-size: 12px; }
        `}} />
      </div>
    );
  }

  // ── Full player (sidebar / inline) ──────────────────────────────────
  return (
    <div className="tts-container">
      <div className="tts-card">
        <div className="tts-header">
          <div className="tts-info">
            <div className="tts-badge">AUDIO</div>
            <span className="tts-title">智能語音導讀</span>
          </div>
          <div className="tts-actions">
            <SpeedStepper />
          </div>
        </div>

        <div className="tts-main">
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className={`control-button ${isPlaying ? 'active' : ''}`}
            aria-label={isPlaying ? '暫停' : '播放'}
          >
            {isLoading ? (
              <div className="loading-spinner"></div>
            ) : isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          <div className="player-track">
            <div
              className="tts-track-wrapper track-sliders"
              onMouseMove={handleTrackHover}
              onMouseLeave={handleTrackLeave}
            >
              {hoverTime !== null && (
                <div className="tts-hover-tip" style={{ left: `${hoverLeft}px` }}>
                  {formatTime(hoverTime)}
                </div>
              )}
              <input
                type="range"
                min="0" max="100" step="0.1"
                value={progress || 0}
                onChange={handleSeek}
                className="range-input"
                style={{ '--progress': `${progress}%` } as React.CSSProperties}
              />
            </div>
            <div className="track-time">
              <span>{formatTime(currentTime)}</span>
              <span className="time-divider">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {ttsError && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--label-secondary)', padding: '6px 8px', background: 'var(--fill-secondary)', borderRadius: '6px' }}>
            ⚠️ {ttsError}
          </div>
        )}
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={() => setIsPlaying(false)}
          onError={handleAudioError}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .tts-container { margin: 0; width: 100%; }
        .tts-card { background: var(--bg-secondary); border: 0.5px solid var(--separator); border-radius: 12px; padding: 16px 18px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); transition: border-color 0.2s; }
        .tts-card:hover { border-color: var(--accent); }
        .tts-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 8px; }
        .tts-info { display: flex; align-items: center; gap: 8px; }
        .tts-badge { font-size: 9px; font-weight: 800; background: var(--accent); color: white; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.05em; }
        .tts-title { font-size: 13px; font-weight: 700; color: var(--label); letter-spacing: -0.01em; }
        .tts-actions { display: flex; gap: 8px; }
        .minimal-select { appearance: none; background: transparent; border: 0.5px solid var(--separator); border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 500; color: var(--label-secondary); cursor: pointer; outline: none; transition: border-color 0.2s; }
        .minimal-select:hover { border-color: var(--label-tertiary); }
        .tts-main { display: flex; align-items: center; gap: 14px; }
        .control-button { width: 42px; height: 42px; border-radius: 50%; border: none; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 3px 10px color-mix(in srgb, var(--accent) 35%, transparent); transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); flex-shrink: 0; }
        .control-button svg { width: 20px; height: 20px; }
        .control-button:hover { transform: scale(1.08); filter: brightness(1.1); }
        .control-button:active { transform: scale(0.95); }
        .control-button.active { background: var(--label); box-shadow: 0 3px 10px rgba(0,0,0,0.15); }
        .control-button:disabled { opacity: 0.6; }
        .player-track { flex-grow: 1; display: flex; flex-direction: column; gap: 6px; }
        .track-time { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--label-tertiary); font-variant-numeric: tabular-nums; }
        .time-divider { opacity: 0.5; }
        .range-input { -webkit-appearance: none; width: 100%; height: 4px; background: var(--separator); border-radius: 2px; outline: none; cursor: pointer; }
        .range-input::-webkit-slider-runnable-track { width: 100%; height: 4px; border-radius: 2px; background: linear-gradient(to right, var(--accent) var(--progress), transparent var(--progress)); }
        .range-input::-webkit-slider-thumb { -webkit-appearance: none; height: 12px; width: 12px; border-radius: 50%; background: white; border: 2px solid var(--accent); margin-top: -4px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); transition: transform 0.1s; }
        .range-input:hover::-webkit-slider-thumb { transform: scale(1.2); }
        .loading-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .tts-track-wrapper { position: relative; width: 100%; }
        .tts-hover-tip { position: absolute; bottom: 100%; transform: translateX(-50%); margin-bottom: 6px; padding: 3px 6px; font-size: 10px; font-weight: 600; background: var(--label); color: var(--bg-primary); border-radius: 4px; pointer-events: none; white-space: nowrap; font-variant-numeric: tabular-nums; z-index: 5; }
        @media (hover: none), (pointer: coarse) { .tts-hover-tip { display: none; } }
        .speed-stepper { display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0; border: 0.5px solid var(--separator); border-radius: 6px; padding: 2px 4px; background: transparent; }
        .speed-stepper button { width: 22px; height: 22px; border: none; background: transparent; color: var(--label-secondary); cursor: pointer; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; line-height: 1; border-radius: 4px; }
        .speed-stepper button:not(:disabled):hover { background: var(--fill-secondary); color: var(--label); }
        .speed-stepper button:disabled { opacity: 0.3; cursor: default; }
        .speed-stepper-value { font-size: 11px; font-weight: 600; color: var(--label); font-variant-numeric: tabular-nums; min-width: 34px; text-align: center; }
      `}} />
    </div>
  );
};
