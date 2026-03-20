"use client";

import { useCallback, useEffect, useState } from "react";
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
