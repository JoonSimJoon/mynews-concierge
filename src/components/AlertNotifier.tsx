"use client";

import { useEffect, useRef, useCallback } from "react";
import { getProfile } from "@/lib/profile-store";

export default function AlertNotifier() {
  const lastCheckRef = useRef<number>(0);
  const notifiedRef = useRef<Set<number>>(new Set());

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const checkAlerts = useCallback(async () => {
    const now = Date.now();
    // 최소 30초 간격
    if (now - lastCheckRef.current < 30000) return;
    lastCheckRef.current = now;

    const stored = localStorage.getItem("mynews_keywords");
    if (!stored) return;
    const keywords: string[] = JSON.parse(stored);
    if (keywords.length === 0) return;

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const profile = getProfile();

    try {
      const res = await fetch("/api/alerts/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, profile }),
      });
      const data = await res.json();

      for (const alert of data.alerts || []) {
        if (notifiedRef.current.has(alert.articleId)) continue;
        notifiedRef.current.add(alert.articleId);

        const notification = new Notification("MyNews 알림", {
          body: alert.alertMessage,
          icon: "/favicon.ico",
          tag: `mynews-${alert.articleId}`,
        });

        notification.onclick = () => {
          window.focus();
          // 피드에서 해당 기사로 이동은 향후 구현
          notification.close();
        };
      }
    } catch {
      // silently fail
    }
  }, [requestPermission]);

  useEffect(() => {
    // 초기 체크
    const timer = setTimeout(checkAlerts, 3000);
    // 주기적 체크 (60초)
    const interval = setInterval(checkAlerts, 60000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [checkAlerts]);

  return null; // 렌더링 없음 - 백그라운드 알림 전용
}
