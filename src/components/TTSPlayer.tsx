import React, { useState, useEffect, useRef } from 'react';
import { listVoices, synthesize, processTextForTTS, type Voice } from '../lib/tts';

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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 即使 API 下線，只要有預合成音訊就顯示
    if (initialAudioUrl) {
      setIsVisible(true);
    } else {
      // 否則進行健康檢查
      listVoices()
        .then(() => setIsVisible(true))
        .catch(() => setIsVisible(false));
    }
  }, [initialAudioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleSynthesize = async () => {
    setIsLoading(true);
    try {
      const ttsText = processTextForTTS(title, tldr || '', content);
      const res = await synthesize({
        text: ttsText,
        // 不在前端傳入 voice，由後端根據設定決定，或暫時保留預設
      });
      setAudioUrl(res.audio_url);
      setIsPlaying(true);
    } catch (e) {
      alert('語音合成失敗：' + (e instanceof Error ? e.message : '未知錯誤'));
    } finally {
      setIsLoading(false);
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
