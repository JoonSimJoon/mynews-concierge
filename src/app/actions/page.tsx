"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ConciergeActionItem } from "@/types";

export default function ActionsPage() {
  const [actions, setActions] = useState<ConciergeActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/concierge/action/today?profileId=1");
      const data = (await res.json()) as { actions: ConciergeActionItem[] };
      setActions(data.actions || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  const handleComplete = async (actionId: number) => {
    const res = await fetch("/api/concierge/action/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId }),
    });

    if (res.ok) {
      await loadActions();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/desk" className="text-zinc-400 hover:text-white shrink-0">←</Link>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-400">Actions</p>
            <h1 className="text-lg font-bold">Action Queue</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 pb-24">
        {loading && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-500">
            Action Queue를 불러오는 중...
          </div>
        )}

        {!loading && (
          <div className="space-y-3">
            {actions.map((action) => (
              <article key={action.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold leading-snug">{action.title}</p>
                    <p className="text-xs text-zinc-500 mt-2">
                      생성 시각 {action.createdAt.slice(0, 16).replace("T", " ")}
                    </p>
                    {action.remindAt && (
                      <p className="text-xs text-amber-300 mt-1">
                        리마인드 {action.remindAt.slice(0, 16).replace("T", " ")}
                      </p>
                    )}
                    {action.note && <p className="text-xs text-zinc-400 mt-1">{action.note}</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${action.actionType === "remind" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                    {action.actionType === "remind" ? "리마인드" : "저장"}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/article/${action.articleId}`}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
                  >
                    기사 보기
                  </Link>
                  <button
                    onClick={() => void handleComplete(action.id)}
                    className="px-3 py-2 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-500"
                  >
                    완료
                  </button>
                </div>
              </article>
            ))}

            {!actions.length && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-sm text-zinc-500">
                아직 등록된 액션이 없습니다. Desk에서 저장하거나 리마인드를 추가해보세요.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
