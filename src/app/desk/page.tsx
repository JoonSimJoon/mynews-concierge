"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CATEGORY_COLORS } from "@/lib/constants";
import { getProfessionConfig } from "@/lib/professions";
import { getProfile } from "@/lib/profile-store";
import type { ConciergeActionItem, ConciergeBriefItem, ConciergeHandoff } from "@/types";

interface BriefResponse {
  greeting: string;
  items: ConciergeBriefItem[];
  totalSpokenDuration: number;
  robotScript: string;
}

export default function DeskPage() {
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [actions, setActions] = useState<ConciergeActionItem[]>([]);
  const [handoff, setHandoff] = useState<ConciergeHandoff | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [robotConnected, setRobotConnected] = useState<boolean | null>(null);
  const [runningSequence, setRunningSequence] = useState<string | null>(null);
  const [robotScript, setRobotScript] = useState<string | null>(null);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const choreographyTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastTimeline = useRef<{ delayMs: number; action: string; gesture?: string; move?: { x: number; y: number; theta: number }; look?: { yaw: number; pitch: number }; description: string }[]>([]);

  const loadDesk = useCallback(async () => {
    setLoading(true);
    const profile = getProfile();
    try {
      const [briefRes, actionsRes, handoffRes] = await Promise.all([
        fetch("/api/concierge/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: 1, profile }),
        }),
        fetch("/api/concierge/action/today?profileId=1"),
        fetch("/api/concierge/handoff/latest?profileId=1"),
      ]);

      const briefData = (await briefRes.json()) as BriefResponse;
      const actionsData = (await actionsRes.json()) as { actions: ConciergeActionItem[] };
      const handoffData = (await handoffRes.json()) as { handoff: ConciergeHandoff | null };

      setBrief(briefData);
      setActions(actionsData.actions || []);
      setHandoff(handoffData.handoff);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  const handleSave = async (articleId: number) => {
    const profile = getProfile();
    const profession = getProfessionConfig(profile.occupation);
    const res = await fetch("/api/concierge/action/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: 1,
        articleId,
        note: `${profession.label}용 확인 기사`,
      }),
    });

    if (res.ok) {
      setStatusMessage("Action Queue에 저장했습니다.");
      await loadDesk();
    }
  };

  const handleRemind = async (articleId: number, preset: "before_leave" | "tomorrow_morning" = "before_leave") => {
    const res = await fetch("/api/concierge/action/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: 1, articleId, preset }),
    });

    if (res.ok) {
      setStatusMessage(preset === "before_leave" ? "퇴근 전 리마인드를 등록했습니다." : "내일 아침 리마인드를 등록했습니다.");
      await loadDesk();
    }
  };

  // 로봇 연결 확인
  useEffect(() => {
    fetch("/api/robot/sequence")
      .then((r) => r.json())
      .then((d) => setRobotConnected(d.connected))
      .catch(() => setRobotConnected(false));
  }, []);

  const playTts = async (text: string) => {
    // 이전 오디오 정리
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    setTtsPlaying(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "female_calm", rate: "+0%" }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          setTtsPlaying(false);
          URL.revokeObjectURL(url);
          ttsAudioRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          setTtsPlaying(false);
          ttsAudioRef.current = null;
          resolve();
        };
        audio.play().catch(() => resolve());
      });
    } catch {
      setTtsPlaying(false);
    }
  };

  const cancelTimeline = () => {
    choreographyTimeouts.current.forEach(clearTimeout);
    choreographyTimeouts.current = [];
    // 안전 정지: 타임라인 취소 시 로봇이 움직이고 있을 수 있으므로 stop 발행
    fetch("/api/robot/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    }).catch(() => {});
  };

  const executeTimeline = (timeline: typeof lastTimeline.current) => {
    cancelTimeline();
    console.log(`[Timeline] Starting ${timeline.length} steps`);
    for (const step of timeline) {
      const tid = setTimeout(() => {
        console.log(`[Timeline] ${step.delayMs}ms: ${step.action} ${step.gesture || ""} ${step.move ? JSON.stringify(step.move) : ""} ${step.look ? JSON.stringify(step.look) : ""}`);
        fetch("/api/robot/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: step.action, gesture: step.gesture, move: step.move, look: step.look }),
        })
          .then((r) => r.json())
          .then((d) => console.log(`[Timeline] ${step.delayMs}ms result:`, d.ok ? "OK" : "FAIL"))
          .catch((e) => console.error(`[Timeline] ${step.delayMs}ms error:`, e));
      }, step.delayMs);
      choreographyTimeouts.current.push(tid);
    }
  };

  const handleRobotSequence = async (type: "morning" | "lunch" | "leaving") => {
    setRunningSequence(type);
    setRobotScript(null);
    cancelTimeline();
    try {
      const res = await fetch("/api/robot/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, profileId: 1 }),
      });
      const data = await res.json();
      const script = data.script || null;
      const timeline = data.timeline || [];
      lastTimeline.current = timeline;

      // 타임라인(로봇 동작)을 먼저 시작 — re-render 전에
      if (timeline.length > 0) {
        executeTimeline(timeline);
      }

      // 상태 업데이트는 타임라인 시작 후
      setRobotScript(script);

      // TTS 재생 (타임라인과 동시 진행)
      if (script) {
        await playTts(script);
        cancelTimeline();
      }

      // 데스크 새로고침은 마지막에
      if (type === "morning" || type === "lunch") {
        void loadDesk();
      }
    } catch {
      setRobotScript("로봇 시퀀스 실행 중 오류가 발생했습니다.");
      cancelTimeline();
    } finally {
      setRunningSequence(null);
    }
  };

  const [testLog, setTestLog] = useState<string[]>([]);
  const testTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const handleTestSequence = () => {
    testTimeouts.current.forEach(clearTimeout);
    testTimeouts.current = [];
    setTestLog(["테스트 시작... (delayMs 기반 setTimeout 체인)"]);

    const steps = [
      // move first (no gesture blocking)
      { delayMs: 0,     payload: { action: "move", move: { x: 0.15, y: 0, theta: 0 } }, label: "0ms: move forward" },
      { delayMs: 1500,  payload: { action: "stop" },                                      label: "1500ms: stop" },
      // wake_up takes 2.5s — NO move/look until 5s
      { delayMs: 2000,  payload: { action: "gesture", gesture: "wake_up" },               label: "2000ms: wake_up (2.5s)" },
      // spin AFTER wake_up finishes
      { delayMs: 5000,  payload: { action: "move", move: { x: 0, y: 0, theta: 30 } },   label: "5000ms: spin" },
      { delayMs: 6200,  payload: { action: "stop" },                                      label: "6200ms: stop" },
      // nod_yes takes 1.4s
      { delayMs: 6500,  payload: { action: "gesture", gesture: "nod_yes" },               label: "6500ms: nod_yes (1.4s)" },
      // confused takes 1.5s — AFTER nod ends at ~7.9s
      { delayMs: 8200,  payload: { action: "gesture", gesture: "confused" },              label: "8200ms: confused (1.5s)" },
      // dance takes 2.5s — AFTER confused ends at ~9.7s
      { delayMs: 10000, payload: { action: "gesture", gesture: "dance" },                 label: "10000ms: dance (2.5s)" },
      // goto_sleep — AFTER dance ends at ~12.5s
      { delayMs: 13000, payload: { action: "gesture", gesture: "goto_sleep" },            label: "13000ms: goto_sleep" },
    ];

    for (const step of steps) {
      const tid = setTimeout(() => {
        setTestLog((prev) => [...prev, `→ ${step.label}`]);
        fetch("/api/robot/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(step.payload),
        })
          .then((r) => r.json())
          .then((d) => setTestLog((prev) => [...prev, `  ✓ ${d.ok ? "OK" : "FAIL"}`]))
          .catch(() => setTestLog((prev) => [...prev, `  ✗ NETWORK ERROR`]));
      }, step.delayMs);
      testTimeouts.current.push(tid);
    }

    const doneTid = setTimeout(() => setTestLog((prev) => [...prev, "테스트 완료 (11s)"]), 12000);
    testTimeouts.current.push(doneTid);
  };

  const profession = (() => {
    if (typeof window === "undefined") return getProfessionConfig();
    return getProfessionConfig(getProfile().occupation);
  })();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-blue-400">Desk</p>
            <h1 className="text-lg font-bold">MyNews Concierge</h1>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
            {profession.label}
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 pb-24 space-y-5">
        <section className="bg-gradient-to-br from-blue-950/60 to-zinc-900 border border-blue-500/20 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-blue-300 mb-2">Morning Brief</p>
              <h2 className="text-xl font-bold leading-tight">
                {brief?.greeting || `${profession.honorific}, 오늘의 핵심 뉴스를 준비 중입니다.`}
              </h2>
            </div>
            {brief && (
              <span className="text-xs text-zinc-400 shrink-0">{brief.totalSpokenDuration}초</span>
            )}
          </div>
          <p className="text-sm text-zinc-400 mt-3">
            오늘 업무와 자산에 연결되는 뉴스만 선별해 보여줍니다.
          </p>
          {statusMessage && (
            <p className="mt-3 text-xs text-emerald-400">{statusMessage}</p>
          )}
        </section>

        {/* Robot Test */}
        <section className="bg-zinc-900 border border-red-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-red-400">Robot Test (debug)</p>
            <button
              onClick={() => void handleTestSequence()}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
            >
              move → wake_up → spin → nod → dance
            </button>
          </div>
          {testLog.length > 0 && (
            <div className="bg-zinc-800/50 rounded-lg p-2 mt-2 space-y-0.5">
              {testLog.map((log, i) => (
                <p key={i} className="text-[11px] text-zinc-400 font-mono">{log}</p>
              ))}
            </div>
          )}
        </section>

        {/* Robot Concierge Controls */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-violet-400">Robot Concierge</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              robotConnected === null ? "bg-zinc-800 text-zinc-500" :
              robotConnected ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-800 text-zinc-500"
            }`}>
              {robotConnected === null ? "확인 중..." : robotConnected ? "연결됨" : "오프라인"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { type: "morning" as const, label: "아침 브리핑", icon: "☀️", desc: "오늘의 핵심 뉴스 3건" },
              { type: "lunch" as const, label: "점심 브리핑", icon: "🍽️", desc: "오전 핵심 요약" },
              { type: "leaving" as const, label: "퇴근 브리핑", icon: "🌙", desc: "미완료 액션 리마인드" },
            ]).map(({ type, label, icon, desc }) => (
              <button
                key={type}
                onClick={() => void handleRobotSequence(type)}
                disabled={runningSequence !== null}
                className={`p-3 rounded-xl border text-left transition-all ${
                  runningSequence === type
                    ? "border-violet-500 bg-violet-500/10 animate-pulse"
                    : "border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-800/50"
                } disabled:opacity-50`}
              >
                <span className="text-lg">{icon}</span>
                <p className="text-xs font-semibold mt-1">{label}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
          {robotScript && (
            <div className="mt-3 bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-zinc-500">
                  {ttsPlaying ? "🔊 낭독 중..." : "로봇 발화 스크립트"}
                </p>
                {!ttsPlaying && (
                  <button
                    onClick={() => {
                      if (lastTimeline.current.length > 0) executeTimeline(lastTimeline.current);
                      void playTts(robotScript);
                    }}
                    className="text-[10px] text-violet-400 hover:text-violet-300"
                  >
                    다시 듣기
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{robotScript}</p>
            </div>
          )}
        </section>

        {handoff && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-400 mb-2">Latest Handoff</p>
            <h3 className="font-semibold leading-tight">{handoff.title}</h3>
            <p className="text-xs text-zinc-500 mt-1">
              최근 로봇 상호작용: {handoff.source} · {handoff.timestamp.slice(0, 16).replace("T", " ")}
            </p>
            <Link
              href={handoff.appDeepLink}
              className="inline-flex mt-3 text-sm text-blue-400 hover:text-blue-300"
            >
              기사 자세히 보기 →
            </Link>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-400">오늘의 핵심 뉴스</h3>
            <button onClick={() => void loadDesk()} className="text-xs text-zinc-500 hover:text-white">
              새로고침
            </button>
          </div>
          {loading && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-sm text-zinc-500">
              Desk를 불러오는 중...
            </div>
          )}
          {!loading && brief?.items?.map((item) => {
            const color = CATEGORY_COLORS[item.category] || "#6b7280";
            return (
              <article key={item.articleId} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
                    {item.category}
                  </span>
                  <span className="text-[10px] text-zinc-500">점수 {item.combinedScore}</span>
                </div>
                <h4 className="font-semibold leading-snug">{item.title}</h4>
                <p className="text-sm text-zinc-300 mt-3">{item.oneSentenceSummary}</p>
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-zinc-400">
                    <span className="text-blue-400 font-semibold">왜 중요한가</span> {item.whyItMatters}
                  </p>
                  <p className="text-zinc-400">
                    <span className="text-emerald-400 font-semibold">오늘의 액션</span> {item.recommendedAction}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={item.appDeepLink}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
                  >
                    자세히 보기
                  </Link>
                  <button
                    onClick={() => void handleSave(item.articleId)}
                    className="px-3 py-2 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-500"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => void handleRemind(item.articleId, "before_leave")}
                    className="px-3 py-2 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-500"
                  >
                    퇴근 전
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-zinc-400">Action Queue</p>
              <h3 className="text-lg font-bold mt-1">오늘 확인할 항목 {actions.length}개</h3>
            </div>
            <Link href="/actions" className="text-sm text-blue-400 hover:text-blue-300">
              전체 보기
            </Link>
          </div>

          <div className="mt-4 space-y-2">
            {actions.slice(0, 3).map((action) => (
              <div key={action.id} className="rounded-xl bg-zinc-950/70 border border-zinc-800 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium line-clamp-1">{action.title}</p>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${action.actionType === "remind" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                    {action.actionType === "remind" ? "리마인드" : "저장"}
                  </span>
                </div>
                {action.remindAt && (
                  <p className="text-xs text-zinc-500 mt-1">
                    {action.remindAt.slice(0, 16).replace("T", " ")}
                  </p>
                )}
              </div>
            ))}
            {!actions.length && (
              <p className="text-sm text-zinc-500">아직 저장되거나 예약된 액션이 없습니다.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
