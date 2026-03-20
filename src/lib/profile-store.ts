/**
 * 클라이언트 사이드 프로필 저장소 (localStorage)
 * 해커톤용 간이 상태 관리
 */

import type { UserProfile } from "@/types";
import { DEMO_PROFILE } from "@/lib/professions";

const PROFILE_KEY = "mynews_profile";
const ONBOARDING_KEY = "mynews_onboarded";

export const DEFAULT_PROFILE: UserProfile = DEMO_PROFILE;

export function getProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  const saved = localStorage.getItem(PROFILE_KEY);
  if (!saved) return DEFAULT_PROFILE;
  try {
    return JSON.parse(saved) as UserProfile;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function resetProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(ONBOARDING_KEY);
}
