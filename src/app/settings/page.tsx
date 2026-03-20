"use client";

import { useState } from "react";
import { getProfile, saveProfile, resetProfile } from "@/lib/profile-store";
import { ONBOARDING_STEPS, CATEGORY_COLORS } from "@/lib/constants";
import type { UserProfile, InterestCategory, WritingStyle, KnowledgeLevel, PoliticalStance, Occupation } from "@/types";
import { getProfessionConfig } from "@/lib/professions";
import Link from "next/link";

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    typeof window === "undefined" ? null : getProfile()
  );
  const [keywords, setKeywords] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("mynews_keywords");
    if (!stored) return [];
    try {
      return JSON.parse(stored) as string[];
    } catch {
      return [];
    }
  });
  const [newKeyword, setNewKeyword] = useState("");
  const [saved, setSaved] = useState(false);

  if (!profile) return null;
  const profession = getProfessionConfig(profile.occupation);

  const handleSave = () => {
    saveProfile(profile);
    localStorage.setItem("mynews_keywords", JSON.stringify(keywords));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (confirm("프로필을 초기화하시겠습니까? 온보딩부터 다시 시작됩니다.")) {
      resetProfile();
      window.location.href = "/";
    }
  };

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const toggleInterest = (interest: string) => {
    const current = profile.interests;
    if (current.includes(interest as InterestCategory)) {
      setProfile({ ...profile, interests: current.filter((i) => i !== interest) });
    } else if (current.length < 5) {
      setProfile({ ...profile, interests: [...current, interest as InterestCategory] });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="text-zinc-400 hover:text-white">← 피드</Link>
          <h1 className="text-lg font-bold">설정</h1>
          <button
            onClick={handleSave}
            className={`text-sm font-semibold transition-colors ${saved ? "text-emerald-400" : "text-blue-400 hover:text-blue-300"}`}
          >
            {saved ? "저장됨!" : "저장"}
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Profile summary card */}
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center shrink-0">
            <span className="text-blue-400 font-bold text-lg">
              {profession.label.slice(0, 1)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {profession.label}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              관심사 {profile.interests.length}개 · {profile.writingStyle || "기본"} 문체 · 지식수준 {profile.knowledgeLevel || "중급"}
            </p>
            <div className="flex gap-1 mt-2 flex-wrap">
              {profile.interests.slice(0, 3).map((interest) => (
                <span
                  key={interest}
                  className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
                >
                  {interest}
                </span>
              ))}
              {profile.interests.length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
                  +{profile.interests.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 관심 분야 */}
        <section className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-400 mb-3">관심 분야 (최대 5개)</h2>
          <div className="flex flex-wrap gap-2">
            {ONBOARDING_STEPS[0].options.map((opt) => {
              const selected = profile.interests.includes(opt.value as InterestCategory);
              const color = CATEGORY_COLORS[opt.value as string] || "#6b7280";
              return (
                <button
                  key={String(opt.value)}
                  onClick={() => toggleInterest(opt.value as string)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    selected ? "border-transparent" : "border-zinc-700 text-zinc-400"
                  }`}
                  style={selected ? { backgroundColor: color + "30", color, borderColor: color + "50" } : {}}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 문체 */}
        <section className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-400 mb-3">선호 문체</h2>
          <div className="grid grid-cols-2 gap-2">
            {ONBOARDING_STEPS[1].options.map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setProfile({ ...profile, writingStyle: opt.value as WritingStyle })}
                className={`p-3 rounded-lg text-left text-xs border transition-all ${
                  profile.writingStyle === opt.value
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <div className="font-semibold">{opt.label}</div>
                <div className="text-zinc-500 mt-0.5">{opt.description}</div>
              </button>
            ))}
          </div>
        </section>

        {/* 지식 수준 */}
        <section className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-400 mb-3">지식 수준</h2>
          <div className="flex gap-2">
            {ONBOARDING_STEPS[2].options.map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setProfile({ ...profile, knowledgeLevel: opt.value as KnowledgeLevel })}
                className={`flex-1 p-3 rounded-lg text-xs text-center border transition-all ${
                  profile.knowledgeLevel === opt.value
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-zinc-700 hover:border-zinc-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* 정치 성향 */}
        <section className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-400 mb-3">정치 성향</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-blue-400">진보</span>
            <input
              type="range"
              min={1}
              max={10}
              value={profile.politicalStance}
              onChange={(e) => setProfile({ ...profile, politicalStance: parseInt(e.target.value) as PoliticalStance })}
              className="flex-1 accent-blue-500"
            />
            <span className="text-xs text-red-400">보수</span>
          </div>
          <p className="text-center text-xs text-zinc-500 mt-1">{profile.politicalStance} / 10</p>
        </section>

        {/* 직업 */}
        <section className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-400 mb-3">직업</h2>
          <div className="flex flex-wrap gap-2">
            {ONBOARDING_STEPS[4].options.map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setProfile({ ...profile, occupation: opt.value as Occupation })}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  profile.occupation === opt.value
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* 알림 키워드 */}
        <section className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-400 mb-3">관심 키워드 알림</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              placeholder="키워드 입력..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <button onClick={addKeyword} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-500">
              추가
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <span key={kw} className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="text-zinc-500 hover:text-red-400 ml-1">×</button>
              </span>
            ))}
            {keywords.length === 0 && <p className="text-xs text-zinc-600">등록된 키워드가 없습니다</p>}
          </div>
        </section>

        {/* 초기화 */}
        <button
          onClick={handleReset}
          className="w-full py-3 rounded-xl border border-red-900 text-red-400 text-sm hover:bg-red-900/20 transition-colors"
        >
          프로필 초기화
        </button>
      </div>
    </div>
  );
}
