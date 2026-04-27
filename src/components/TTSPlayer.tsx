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
}

export const TTSPlayer: React.FC<TTSPlayerProps> = ({
  title,
  tldr,
  content,
  initialAudioUrl,
  initialSrtUrl,
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
  const [voices, setVoices] = useState<{ name: string; gender: string; locale: string }[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (initialAudioUrl) {
      setIsVisible(true);
    } else {
      // Check D1 for cached audio_url (set by previous visitor)
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

  // Auto-play when a new audioUrl is set (after synthesis)
  useEffect(() => {
    if (audioUrl && isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [audioUrl]);

  const handleSynthesize = async () => {
    setIsLoading(true);
    const slug = location.pathname.split('/').filter(Boolean).pop() ?? '';
    const ttsText = processTextForTTS(title, tldr || '', content);

    // Try MediaSource streaming (play while receiving)
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

              // Cache to R2 in background — call synthesize to store wav
              fetch(`/api/tts/cache`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: ttsText, slug }),
              }).then(async r => {
                if (r.ok) {
                  const data = await r.json() as { audio_url: string };
                  setAudioUrl(data.audio_url);
                  URL.revokeObjectURL(objectUrl);
                  // Persist audio_url to D1 so next page load skips synthesis
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
      // Fallback: collect all then play
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
        // Cache to R2 via synthesize (wav)
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

  const togglePlay = () => {
    if (!audioUrl) {
      handleSynthesize();
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      setCurrentTime(current);
      setDuration(dur);
      setProgress((current / dur) * 100);
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

  if (!isVisible) return null;

  return (
    <div className="tts-container">
      <div className="tts-card">
        <div className="tts-header">
          <div className="tts-info">
            <div className="tts-badge">AUDIO</div>
            <span className="tts-title">智能語音導讀</span>
          </div>
          
          <div className="tts-actions">
            <div className="select-wrapper">
              <select 
                value={playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="minimal-select"
              >
                <option value="0.75">0.75x</option>
                <option value="1">1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2.0x</option>
              </select>
            </div>
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
            <div className="track-sliders">
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="0.1"
                value={progress || 0} 
                onChange={handleSeek}
                className="range-input"
                style={{ '--progress': `${progress}%` } as any}
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
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .tts-container { margin: 32px 0; width: 100%; }
        .tts-card { background: var(--bg-secondary); border: 1px solid var(--separator); border-radius: 16px; padding: 18px 22px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .tts-card:hover { border-color: var(--accent); box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
        .tts-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .tts-info { display: flex; align-items: center; gap: 10px; }
        .tts-badge { font-size: 9px; font-weight: 800; background: var(--accent); color: white; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.05em; }
        .tts-title { font-size: 14px; font-weight: 700; color: var(--label); letter-spacing: -0.01em; }
        .tts-actions { display: flex; gap: 8px; }
        .minimal-select { appearance: none; background: rgba(255,255,255,0.05); border: 1px solid var(--separator); border-radius: 8px; padding: 5px 12px; font-size: 12px; font-weight: 500; color: var(--label-secondary); cursor: pointer; outline: none; transition: all 0.2s; }
        .minimal-select:hover { background: rgba(255,255,255,0.08); border-color: var(--label-tertiary); }
        .tts-main { display: flex; align-items: center; gap: 18px; }
        .control-button { width: 48px; height: 48px; border-radius: 50%; border: none; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 40%, transparent); transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); flex-shrink: 0; }
        .control-button svg { width: 22px; height: 22px; }
        .control-button:hover { transform: scale(1.1); filter: brightness(1.1); }
        .control-button:active { transform: scale(0.95); }
        .control-button.active { background: var(--label); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .player-track { flex-grow: 1; display: flex; flex-direction: column; gap: 8px; }
        .track-time { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--label-tertiary); font-variant-numeric: tabular-nums; }
        .time-divider { opacity: 0.5; }
        .range-input { -webkit-appearance: none; width: 100%; height: 6px; background: var(--separator); border-radius: 3px; outline: none; cursor: pointer; position: relative; }
        .range-input::-webkit-slider-runnable-track { width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(to right, var(--accent) var(--progress), transparent var(--progress)); }
        .range-input::-webkit-slider-thumb { -webkit-appearance: none; height: 14px; width: 14px; border-radius: 50%; background: white; border: 2px solid var(--accent); margin-top: -4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.1s; }
        .range-input:hover::-webkit-slider-thumb { transform: scale(1.2); }
        .loading-spinner { width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) { .tts-card { padding: 14px 16px; } .tts-header { margin-bottom: 16px; } .control-button { width: 42px; height: 42px; } }
      `}} />
    </div>
  );
};
