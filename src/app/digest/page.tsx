"use client";

import { useState, useEffect } from "react";
import { getProfile, DEFAULT_PROFILE } from "@/lib/profile-store";
import { CATEGORY_COLORS } from "@/lib/constants";
import type { UserProfile } from "@/types";
import Link from "next/link";

interface CategoryStat {
  category_name: string;
  count: number;
}

export default function DigestPage() {
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [digest, setDigest] = useState<string>("");
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  useEffect(() => {
    fetchDigest();
    fetchCategoryStats();
  }, [period, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDigest = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, profile }),
      });
      const data = await res.json();
      setDigest(data.digest || "다이제스트를 생성할 수 없습니다.");
    } catch {
      setDigest("다이제스트를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryStats = async () => {
    try {
      const res = await fetch("/api/stats/categories");
      const data = await res.json();
      setCategoryStats(data.categories || []);
    } catch {
      // silently fail
    }
  };

  const maxCount = Math.max(...categoryStats.map((c) => c.count), 1);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="text-zinc-400 hover:text-white">
            ← 피드
          </Link>
          <h1 className="text-lg font-bold">뉴스 다이제스트</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Period Toggle */}
        <div className="flex gap-2 bg-zinc-900 p-1 rounded-lg">
          {(["daily", "weekly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
                period === p ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {p === "daily" ? "오늘" : "이번 주"}
            </button>
          ))}
        </div>

        {/* Digest Content */}
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-400 mb-3">
            {period === "daily" ? "오늘의" : "이번 주"} AI 요약
          </h2>
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-3.5 bg-zinc-800 rounded-full w-full" />
              <div className="h-3.5 bg-zinc-800 rounded-full w-11/12" />
              <div className="h-3.5 bg-zinc-800 rounded-full w-5/6" />
              <div className="h-3.5 bg-zinc-800 rounded-full w-4/5" />
              <div className="h-3.5 bg-zinc-800 rounded-full w-3/4" />
              <div className="h-3.5 bg-zinc-800 rounded-full w-2/3" />
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-line">{digest}</p>
          )}
        </div>

        {/* Category Chart */}
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-400 mb-4">카테고리별 기사 분포</h2>
          <div className="space-y-3">
            {categoryStats.slice(0, 10).map((stat) => {
              const color = CATEGORY_COLORS[stat.category_name] || "#6b7280";
              const width = (stat.count / maxCount) * 100;
              const isInterest = profile.interests.includes(stat.category_name as never);
              return (
                <div key={stat.category_name} className="flex items-center gap-3">
                  <span className={`text-xs w-16 shrink-0 ${isInterest ? "font-bold text-blue-400" : "text-zinc-400"}`}>
                    {stat.category_name}
                  </span>
                  <div className="flex-1 h-6 bg-zinc-800/60 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(width, 8)}%`, backgroundColor: color + "cc" }}
                    >
                      {width > 20 && (
                        <span className="text-[10px] font-semibold text-white/80">
                          {stat.count.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {width <= 20 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                        {stat.count.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {isInterest && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Profile Summary */}
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-400 mb-3">나의 뉴스 성향</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-zinc-500 mb-1">정치 성향 스펙트럼</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-400">진보</span>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full relative">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"
                    style={{ left: `${((profile.politicalStance - 1) / 9) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-red-400">보수</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <span
                  key={interest}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: (CATEGORY_COLORS[interest] || "#6b7280") + "20",
                    color: CATEGORY_COLORS[interest] || "#6b7280",
                  }}
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
