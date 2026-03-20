"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getProfile } from "@/lib/profile-store";
import { CATEGORY_COLORS } from "@/lib/constants";
import TtsPlayer from "@/components/TtsPlayer";

interface ArticleDetail {
  article_id: number;
  title: string;
  sub_title?: string;
  body_text: string;
  body_html: string;
  summary?: string;
  writers?: string;
  reg_dt?: string;
  service_daytime: string;
  main_category: string;
  category_name?: string;
  image_url?: string;
  image_caption?: string;
  like_count: number;
  reply_count: number;
  comment_count: number;
}

interface PersonalizedResult {
  personalizedTitle: string;
  personalizedBody: string;
  personalizedSummary: string;
  tone: string;
  perspective: string;
}

type ViewMode = "original" | "personalized";

export default function ArticleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [personalized, setPersonalized] = useState<PersonalizedResult | null>(null);
  const [personalizing, setPersonalizing] = useState(false);
  const [personalizeError, setPersonalizeError] = useState<string | null>(null);

  const [view, setView] = useState<ViewMode>("original");

  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [relatedArticles, setRelatedArticles] = useState<{ article_id: number; title: string; category_name: string; service_daytime: string }[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/articles/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("기사를 찾을 수 없습니다.");
        return res.json();
      })
      .then((data: ArticleDetail) => {
        setArticle(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // 관련 기사 로드
  useEffect(() => {
    if (!id) return;
    fetch(`/api/related?articleId=${id}`)
      .then((res) => res.json())
      .then((data) => setRelatedArticles(data.articles || []))
      .catch(() => {});
  }, [id]);

  const handleExplain = async () => {
    if (!article || explaining) return;
    setExplaining(true);
    const profile = getProfile();
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.article_id, profile }),
      });
      const data = await res.json();
      setExplanation(data.explanation || "해설을 생성할 수 없습니다.");
    } catch {
      setExplanation("해설 생성 중 오류가 발생했습니다.");
    } finally {
      setExplaining(false);
    }
  };

  const handlePersonalize = async () => {
    if (!article || personalizing) return;
    setPersonalizing(true);
    setPersonalizeError(null);

    const profile = getProfile();
    try {
      const res = await fetch("/api/personalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.article_id, profile }),
      });
      const data = await res.json();
      if (!res.ok || !data.personalized) {
        setPersonalizeError(data.error || "개인화에 실패했습니다. API 키를 확인해주세요.");
        setPersonalizing(false);
        return;
      }
      setPersonalized(data.personalized as PersonalizedResult);
      setView("personalized");
    } catch {
      setPersonalizeError("네트워크 오류가 발생했습니다.");
    } finally {
      setPersonalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse text-lg">기사를 불러오는 중...</div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-zinc-400">{error || "기사를 찾을 수 없습니다."}</p>
        <button
          onClick={() => router.back()}
          className="text-blue-400 text-sm underline"
        >
          돌아가기
        </button>
      </div>
    );
  }

  const categoryName = article.category_name || article.main_category || "뉴스";
  const color = CATEGORY_COLORS[categoryName] || "#6b7280";
  const date = article.service_daytime?.slice(0, 10) || "";

  const displayTitle = view === "personalized" && personalized
    ? personalized.personalizedTitle
    : article.title;

  const displayBody = view === "personalized" && personalized
    ? personalized.personalizedBody
    : article.body_text;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-white transition-colors shrink-0"
            aria-label="뒤로 가기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="text-base font-bold truncate flex-1">
            <span className="text-blue-500">My</span>News
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Category & Meta */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: color + "20", color }}
          >
            {categoryName}
          </span>
          <span className="text-xs text-zinc-500">{date}</span>
          {article.writers && (
            <span className="text-xs text-zinc-500">{article.writers}</span>
          )}
          {view === "personalized" && personalized && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 ml-auto">
              AI 맞춤
            </span>
          )}
        </div>

        {/* Image */}
        {article.image_url && (
          <div className="mb-5 rounded-xl overflow-hidden">
            <img
              src={article.image_url}
              alt={article.image_caption || ""}
              className="w-full object-cover max-h-56"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {article.image_caption && (
              <p className="text-xs text-zinc-500 mt-1.5 px-1">{article.image_caption}</p>
            )}
          </div>
        )}

        {/* Toggle tabs (only when personalized) */}
        {personalized && (
          <div className="flex gap-1 mb-5 bg-zinc-900 rounded-xl p-1">
            <button
              onClick={() => setView("original")}
              className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-colors ${
                view === "original"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              원본
            </button>
            <button
              onClick={() => setView("personalized")}
              className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-colors ${
                view === "personalized"
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              AI 맞춤
            </button>
          </div>
        )}

        {/* Title */}
        <h2 className="text-xl font-bold leading-snug mb-4">{displayTitle}</h2>

        {/* Personalized meta info */}
        {view === "personalized" && personalized && (
          <div className="flex gap-2 flex-wrap mb-4">
            {personalized.tone && (
              <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">
                {personalized.tone}
              </span>
            )}
            {personalized.perspective && (
              <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">
                {personalized.perspective}
              </span>
            )}
          </div>
        )}

        {/* TTS (personalized view only) */}
        {view === "personalized" && personalized && (
          <div className="mb-5">
            <TtsPlayer
              text={personalized.personalizedBody}
              title={personalized.personalizedTitle}
            />
          </div>
        )}

        {/* Summary (personalized view) */}
        {view === "personalized" && personalized?.personalizedSummary && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5">
            <p className="text-xs font-bold text-emerald-400 mb-2">핵심 요약</p>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
              {personalized.personalizedSummary}
            </p>
          </div>
        )}

        {/* Body text */}
        <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
          {displayBody}
        </div>

        {/* AI 해설 */}
        <div className="mt-6 pt-4 border-t border-zinc-800">
          {!explanation ? (
            <button
              onClick={handleExplain}
              disabled={explaining}
              className={`w-full py-3 rounded-xl text-sm font-semibold border transition-all ${
                explaining
                  ? "border-zinc-700 text-zinc-500"
                  : "border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
              }`}
            >
              {explaining ? "AI 해설 생성 중..." : "🔍 AI 해설 보기"}
            </button>
          ) : (
            <div className="bg-gradient-to-br from-violet-950/30 to-zinc-900 rounded-xl p-5 border border-violet-500/20">
              <h3 className="text-sm font-bold text-violet-400 mb-3">AI 해설</h3>
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{explanation}</div>
            </div>
          )}
        </div>

        {/* 관련 기사 */}
        {relatedArticles.length > 0 && (
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-400 mb-3">관련 기사</h3>
            <div className="space-y-2">
              {relatedArticles.map((ra) => (
                <button
                  key={ra.article_id}
                  onClick={() => router.push(`/article/${ra.article_id}`)}
                  className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-600 transition-colors"
                >
                  <p className="text-sm font-medium leading-tight line-clamp-2">{ra.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-zinc-500">{ra.category_name}</span>
                    <span className="text-[10px] text-zinc-600">{ra.service_daytime?.slice(0, 10)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 text-xs text-zinc-600 mt-6 pt-4 border-t border-zinc-800">
          <span>♡ {article.like_count}</span>
          <span>💬 {article.comment_count}</span>
        </div>
      </main>

      {/* Sticky bottom action */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto">
          {personalizeError && (
            <p className="text-xs text-red-400 mb-2 text-center">{personalizeError}</p>
          )}
          {!personalized ? (
            <button
              onClick={handlePersonalize}
              disabled={personalizing}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                personalizing
                  ? "bg-zinc-800 text-zinc-500"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              {personalizing ? "AI 맞춤 읽기 생성 중..." : "AI 맞춤 읽기"}
            </button>
          ) : (
            <button
              onClick={() => setView(view === "original" ? "personalized" : "original")}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
            >
              {view === "original" ? "AI 맞춤 버전 보기" : "원본 보기"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
