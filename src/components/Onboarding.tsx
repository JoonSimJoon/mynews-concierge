"use client";

import { useState } from "react";
import { ONBOARDING_STEPS } from "@/lib/constants";
import { saveProfile, DEFAULT_PROFILE } from "@/lib/profile-store";
import type { UserProfile, InterestCategory, WritingStyle, KnowledgeLevel, PoliticalStance, Occupation } from "@/types";

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE });

  const currentStep = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  const handleSelect = (value: string | number) => {
    const field = currentStep.field;

    if (field === "interests") {
      const current = profile.interests || [];
      const strValue = value as string;
      const updated = current.includes(strValue as InterestCategory)
        ? current.filter((i) => i !== strValue)
        : current.length < 5
          ? [...current, strValue as InterestCategory]
          : current;
      setProfile({ ...profile, interests: updated });
      return;
    }

    if (field === "politicalStance") {
      setProfile({ ...profile, politicalStance: value as PoliticalStance });
    } else if (field === "writingStyle") {
      setProfile({ ...profile, writingStyle: value as WritingStyle });
    } else if (field === "knowledgeLevel") {
      setProfile({ ...profile, knowledgeLevel: value as KnowledgeLevel });
    } else if (field === "occupation") {
      setProfile({ ...profile, occupation: value as Occupation });
    }
  };

  const handleNext = () => {
    if (isLast) {
      saveProfile(profile);
      onComplete(profile);
    } else {
      setStep(step + 1);
    }
  };

  const isSelected = (value: string | number): boolean => {
    const field = currentStep.field;
    if (field === "interests") {
      return (profile.interests || []).includes(value as InterestCategory);
    }
    return profile[field] === value;
  };

  const canProceed = (): boolean => {
    if (currentStep.field === "interests") {
      return (profile.interests || []).length > 0;
    }
    return true;
  };

  if (showSplash) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          {/* Logo mark */}
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="6" width="18" height="2.5" rx="1.25" fill="#3b82f6" />
                <rect x="4" y="12" width="24" height="2.5" rx="1.25" fill="#3b82f6" opacity="0.7" />
                <rect x="4" y="18" width="20" height="2.5" rx="1.25" fill="#3b82f6" opacity="0.5" />
                <rect x="4" y="24" width="14" height="2.5" rx="1.25" fill="#3b82f6" opacity="0.3" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-br from-blue-400 via-blue-300 to-blue-500 bg-clip-text text-transparent tracking-tight">
            MyNews
          </h1>
          <p className="text-zinc-400 text-lg mb-10 font-medium">같은 뉴스, 나만의 시선</p>

          {/* Value props */}
          <div className="space-y-4 mb-12 text-left">
            <div className="flex items-start gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI가 나에게 맞게 재작성</p>
                <p className="text-xs text-zinc-500 mt-0.5">내 관심사, 지식 수준, 문체에 맞춘 맞춤 요약</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">매일 뉴스 다이제스트</p>
                <p className="text-xs text-zinc-500 mt-0.5">하루의 핵심 뉴스를 한눈에 파악</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">음성으로 듣는 뉴스</p>
                <p className="text-xs text-zinc-500 mt-0.5">이동 중에도 편하게 뉴스 청취</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => setShowSplash(false)}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
      {/* Progress bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex gap-1.5">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-blue-500" : "bg-zinc-800"
              }`}
            />
          ))}
        </div>
        <p className="text-zinc-500 text-sm mt-2">{step + 1} / {ONBOARDING_STEPS.length}</p>
      </div>

      {/* Question */}
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{currentStep.question}</h1>
        <p className="text-zinc-400">{currentStep.description}</p>
      </div>

      {/* Options */}
      <div className={`w-full max-w-md grid gap-3 mb-8 ${
        currentStep.field === "interests" ? "grid-cols-2" : "grid-cols-1"
      }`}>
        {currentStep.options.map((option) => (
          <button
            key={String(option.value)}
            onClick={() => handleSelect(option.value)}
            className={`p-4 rounded-xl text-left transition-all border ${
              isSelected(option.value)
                ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
            }`}
          >
            <div className="font-semibold text-sm">{option.label}</div>
            {option.description && (
              <div className="text-xs text-zinc-400 mt-1">{option.description}</div>
            )}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="w-full max-w-md flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            이전
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
            canProceed()
              ? "bg-blue-600 hover:bg-blue-500 text-white"
              : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
          }`}
        >
          {isLast ? "시작하기" : "다음"}
        </button>
      </div>
    </div>
  );
}
