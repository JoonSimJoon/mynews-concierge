"use client";

import { useState } from "react";
import Onboarding from "@/components/Onboarding";
import NewsFeed from "@/components/NewsFeed";
import { isOnboarded } from "@/lib/profile-store";

export default function Home() {
  const [onboarded, setOnboarded] = useState<boolean | null>(() =>
    typeof window === "undefined" ? null : isOnboarded()
  );

  const handleOnboardingComplete = () => {
    setOnboarded(true);
  };

  // 로딩 상태 (SSR hydration)
  if (onboarded === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            <span className="text-blue-500">My</span>News
          </h1>
          <p className="text-zinc-500">나만의 AI 신문</p>
        </div>
      </div>
    );
  }

  if (!onboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return <NewsFeed />;
}
