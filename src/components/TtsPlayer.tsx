"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface TtsPlayerProps {
  text: string;
  title?: string;
}

const VOICE_OPTIONS = [
  { id: "female_calm", label: "선희 (차분)" },
  { id: "male_calm", label: "인준 (차분)" },
  { id: "female_bright", label: "지민 (밝은)" },
  { id: "male_news", label: "봉진 (뉴스)" },
  { id: "female_friendly", label: "서현 (친근)" },
  { id: "male_friendly", label: "국민 (친근)" },
];

const RATE_OPTIONS = [
  { value: "-25%", label: "0.75x" },
  { value: "+0%", label: "1x" },
  { value: "+25%", label: "1.25x" },
  { value: "+50%", label: "1.5x" },
];

export default function TtsPlayer({ text, title }: TtsPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [voice, setVoice] = useState("female_calm");
  const [rateIdx, setRateIdx] = useState(1);
  const [showVoices, setShowVoices] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number | null>(null);

  // 클린업
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const updateProgress = useCallback(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    if (audio.duration && !isNaN(audio.duration)) {
      setProgress((audio.currentTime / audio.duration) * 100);
      setDuration(audio.duration);
    }
    if (!audio.paused) {
      animRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const handlePlay = async () => {
    // 정지
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    // 이미 로드된 오디오가 있으면 재개
    if (audioRef.current && audioRef.current.src && !audioRef.current.ended) {
      audioRef.current.play();
      setPlaying(true);
      animRef.current = requestAnimationFrame(updateProgress);
      return;
    }

    // Edge TTS로 새 오디오 생성
    setLoading(true);
    setProgress(0);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice,
          rate: RATE_OPTIONS[rateIdx].value,
        }),
      });

      if (!res.ok) throw new Error("TTS 생성 실패");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // 기존 오디오 정리
      if (audioRef.current) {
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setPlaying(false);
        setProgress(100);
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };

      audio.onerror = () => {
        setPlaying(false);
        setLoading(false);
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };

      audio.oncanplay = () => {
        setLoading(false);
        audio.play();
        setPlaying(true);
        animRef.current = requestAnimationFrame(updateProgress);
      };
    } catch {
      setLoading(false);
    }
  };

  const handleRateChange = () => {
    const nextIdx = (rateIdx + 1) % RATE_OPTIONS.length;
    setRateIdx(nextIdx);
    // 속도 변경 시 현재 오디오 초기화 (다음 재생 시 새 속도 적용)
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setPlaying(false);
    setProgress(0);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  };

  const handleVoiceChange = (v: string) => {
    setVoice(v);
    setShowVoices(false);
    // 목소리 변경 시 현재 오디오 초기화
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setPlaying(false);
    setProgress(0);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentTime = duration ? (progress / 100) * duration : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-3">
        {/* Play/Stop */}
        <button
          onClick={handlePlay}
          disabled={loading}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            loading
              ? "bg-zinc-700 animate-pulse"
              : playing
                ? "bg-red-600 hover:bg-red-500"
                : "bg-blue-600 hover:bg-blue-500"
          }`}
        >
          {loading ? (
            <span className="text-white text-xs">...</span>
          ) : playing ? (
            <span className="text-white text-sm font-bold">■</span>
          ) : (
            <span className="text-white text-sm font-bold ml-0.5">▶</span>
          )}
        </button>

        {/* Info & Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-400 truncate flex-1">{title || "기사 읽기"}</p>
            {duration > 0 && (
              <span className="text-[10px] text-zinc-600 ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            )}
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-75"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Speed */}
        <button
          onClick={handleRateChange}
          className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md hover:bg-zinc-700 shrink-0"
        >
          {RATE_OPTIONS[rateIdx].label}
        </button>
      </div>

      {/* Voice selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowVoices(!showVoices)}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
          </svg>
          {VOICE_OPTIONS.find((v) => v.id === voice)?.label || "선희"}
          <span className="text-[10px]">{showVoices ? "▲" : "▼"}</span>
        </button>
      </div>

      {showVoices && (
        <div className="grid grid-cols-3 gap-1.5">
          {VOICE_OPTIONS.map((v) => (
            <button
              key={v.id}
              onClick={() => handleVoiceChange(v.id)}
              className={`text-[11px] py-1.5 px-2 rounded-lg border transition-all ${
                voice === v.id
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
