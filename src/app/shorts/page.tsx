"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CATEGORY_COLORS } from "@/lib/constants";
import Link from "next/link";

interface ShortItem {
  id: number;
  article_id: number;
  original_title: string;
  short_title: string;
  short_body: string;
  short_summary: string;
  category_name: string;
  image_url?: string;
  tts_voice: string;
  service_daytime: string;
  audio_size: number;
}

export default function ShortsPage() {
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  // 오디오 관리 - 단일 ref + 세대 카운터로 겹침 방지
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number | null>(null);
  const generationRef = useRef(0); // 오디오 세대 카운터

  useEffect(() => {
    fetch("/api/shorts?limit=20")
      .then((r) => r.json())
      .then((data) => {
        setShorts(data.shorts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 현재 오디오를 완전히 정리 */
  const stopAudio = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.pause();
      audio.oncanplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.ontimeupdate = null;
      audio.src = "";
      audio.load(); // src 초기화 강제 적용
      audioRef.current = null;
    }
    setPlaying(false);
  }, []);

  /** 프로그레스 업데이트 */
  const updateProgress = useCallback(() => {
    if (!audioRef.current) return;
    const a = audioRef.current;
    if (a.duration && !isNaN(a.duration)) {
      setProgress((a.currentTime / a.duration) * 100);
    }
    if (!a.paused && !a.ended) {
      animRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  /** 현재 숏츠 재생 */
  const playCurrentShort = useCallback((idx: number) => {
    if (shorts.length === 0 || !shorts[idx]) return;

    // 세대 카운터 증가 - 이전 비동기 콜백 무효화
    const thisGeneration = ++generationRef.current;

    // 이전 오디오 완전 정리
    stopAudio();
    setProgress(0);

    const short = shorts[idx];
    if (short.audio_size < 100) return; // TTS 없는 숏츠 스킵

    const audio = new Audio();
    audioRef.current = audio;

    audio.oncanplay = () => {
      // 세대 체크 - 이미 다른 숏츠로 넘어갔으면 재생하지 않음
      if (generationRef.current !== thisGeneration) {
        audio.pause();
        audio.src = "";
        return;
      }
      audio.play().catch(() => {});
      setPlaying(true);
      animRef.current = requestAnimationFrame(updateProgress);
    };

    audio.ontimeupdate = () => {
      if (generationRef.current !== thisGeneration) return;
      if (audio.duration && !isNaN(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      if (generationRef.current !== thisGeneration) return;
      setPlaying(false);
      setProgress(100);
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      // 자동 다음 숏츠
      if (idx < shorts.length - 1) {
        setTimeout(() => {
          if (generationRef.current === thisGeneration) {
            setCurrentIdx(idx + 1);
          }
        }, 800);
      }
    };

    audio.onerror = () => {
      if (generationRef.current !== thisGeneration) return;
      setPlaying(false);
    };

    // src 설정은 이벤트 핸들러 등록 후
    audio.src = `/api/shorts/audio?id=${short.id}`;
    audio.load();
  }, [shorts, stopAudio, updateProgress]);

  // currentIdx 변경 시 재생
  useEffect(() => {
    if (shorts.length === 0) return;
    setTransitioning(true);
    const timer = setTimeout(() => {
      playCurrentShort(currentIdx);
      setTransitioning(false);
    }, 100); // 전환 애니메이션 시간
    return () => clearTimeout(timer);
  }, [currentIdx, shorts, playCurrentShort]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
      animRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const goNext = () => {
    if (currentIdx < shorts.length - 1) {
      stopAudio();
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentIdx > 0) {
      stopAudio();
      setCurrentIdx((prev) => prev - 1);
    }
  };

  // 터치 스와이프
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    const elapsed = Date.now() - touchStartTime.current;
    // 빠른 스와이프(300ms 이내) 또는 충분한 거리(80px)
    if ((Math.abs(diff) > 80) || (Math.abs(diff) > 40 && elapsed < 300)) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  // 키보드
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") goNext();
      else if (e.key === "ArrowUp" || e.key === "k") goPrev();
      else if (e.key === " ") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, playing]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">숏츠 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-6 z-50">
        <div className="text-center">
          <p className="text-5xl mb-4">📰</p>
          <h2 className="text-xl font-bold text-white mb-2">숏츠가 아직 없어요</h2>
          <p className="text-zinc-500 text-sm mb-6">
            숏츠를 생성하려면 터미널에서 실행하세요:<br/>
            <code className="text-blue-400 text-xs mt-2 block">npx tsx src/scripts/generate-shorts.ts</code>
          </p>
          <Link href="/" className="text-blue-400 text-sm hover:text-blue-300">피드로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const current = shorts[currentIdx];
  const color = CATEGORY_COLORS[current.category_name] || "#6b7280";

  return (
    <div
      className="fixed inset-0 bg-black text-white z-50 select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 9:16 컨테이너 - 데스크톱에서도 모바일 비율 */}
      <div className="h-full w-full max-w-[min(100vw,56.25vh)] mx-auto relative overflow-hidden">

        {/* Background Image - 블러 + 커버 */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${transitioning ? "opacity-0" : "opacity-100"}`}>
          {current.image_url ? (
            <>
              {/* 블러 배경 (이미지 깨짐 방지) */}
              <img
                src={current.image_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {/* 선명한 메인 이미지 (중앙 배치) */}
              <img
                src={current.image_url}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
          )}
        </div>
        {/* 그라디언트 오버레이 - 강한 하단 그라디언트로 텍스트 가독성 확보 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/90" />

        {/* 콘텐츠 래퍼 */}
        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${transitioning ? "opacity-0" : "opacity-100"}`}>

          {/* 상단: 프로그레스 바 + 헤더 */}
          <div className="pt-[env(safe-area-inset-top,12px)] px-4">
            {/* Progress Bars */}
            <div className="flex gap-1 pt-2 pb-2">
              {shorts.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-100"
                    style={{
                      width: i < currentIdx ? "100%" : i === currentIdx ? `${progress}%` : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between py-2">
              <Link href="/" className="flex items-center gap-1.5 text-white/80 hover:text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span className="text-sm font-semibold">MyNews</span>
              </Link>
              <span className="text-xs font-bold text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
                {currentIdx + 1} / {shorts.length}
              </span>
            </div>
          </div>

          {/* 중앙: 터치 영역 (탭으로 재생/정지) */}
          <div className="flex-1" onClick={togglePlay} />

          {/* 하단: 콘텐츠 */}
          <div className="px-5 pb-[env(safe-area-inset-bottom,24px)]">
            {/* 재생 인디케이터 */}
            <div className="flex items-center gap-2 mb-4">
              {playing ? (
                <div className="flex items-center gap-[3px] bg-blue-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <div className="flex items-center gap-[2px]">
                    {[1,2,3,4,5].map((i) => (
                      <div
                        key={i}
                        className="w-[2.5px] bg-blue-400 rounded-full"
                        style={{
                          height: `${6 + (i % 3) * 4}px`,
                          animation: `pulse 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-blue-300 ml-1.5 font-medium">듣는 중</span>
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <span className="text-[11px] text-white/50">화면을 탭하면 재생돼요</span>
                </div>
              )}
            </div>

            {/* Category */}
            <span
              className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full mb-3 backdrop-blur-sm"
              style={{ backgroundColor: color + "30", color, border: `1px solid ${color}40` }}
            >
              {current.category_name}
            </span>

            {/* Short Title - 크고 임팩트있게 */}
            <h1 className="text-[26px] font-black leading-[1.15] mb-4 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] tracking-tight">
              {current.short_title}
            </h1>

            {/* Summary - 한 줄 핵심만 */}
            <div className="bg-white/8 backdrop-blur-md rounded-2xl px-4 py-3 mb-5 border border-white/10">
              <p className="text-[14px] leading-[1.5] text-white/85 font-medium">
                {current.short_summary}
              </p>
            </div>

            {/* Bottom: 원본 링크 */}
            <div className="flex items-center justify-between pb-1">
              <Link
                href={`/article/${current.article_id}`}
                className="text-[11px] text-white/35 hover:text-white/60 transition-colors flex items-center gap-1"
              >
                <span>원본 기사 보기</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <span className="text-[10px] text-white/20">
                {current.service_daytime?.slice(0, 10)}
              </span>
            </div>
          </div>
        </div>

        {/* 사이드 컨트롤 */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            disabled={currentIdx === 0}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 disabled:opacity-20 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-all"
          >
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <polygon points="5 3 19 12 5 21" />
              </svg>
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            disabled={currentIdx >= shorts.length - 1}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 disabled:opacity-20 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
