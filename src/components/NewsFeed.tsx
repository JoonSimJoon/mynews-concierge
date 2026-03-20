"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import FeedCard from "./FeedCard";
import { getProfile, DEFAULT_PROFILE } from "@/lib/profile-store";
import type { UserProfile } from "@/types";

interface ArticleItem {
  article_id: number;
  title: string;
  summary: string;
  category_name: string;
  image_url?: string;
  service_daytime: string;
  like_count: number;
  comment_count: number;
}

interface PersonalizedCache {
  [articleId: number]: {
    title: string;
    summary: string;
    loading: boolean;
    error?: boolean;
  };
}

export default function NewsFeed() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [personalized, setPersonalized] = useState<PersonalizedCache>({});
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const fetchArticles = useCallback(async (pageNum: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const interests = profile.interests.join(",");
      const res = await fetch(`/api/feed?interests=${encodeURIComponent(interests)}&page=${pageNum}&limit=10`);
      const data = await res.json();
      if (data.articles.length === 0) {
        setHasMore(false);
      } else {
        setArticles((prev) => pageNum === 1 ? data.articles : [...prev, ...data.articles]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, profile.interests]);

  useEffect(() => {
    fetchArticles(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchArticles(nextPage);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [page, hasMore, loading, fetchArticles]);

  const handlePersonalize = async (articleId: number) => {
    if (personalized[articleId]?.loading) return;

    setPersonalized((prev) => ({
      ...prev,
      [articleId]: { title: "", summary: "", loading: true },
    }));

    try {
      const res = await fetch("/api/personalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, profile }),
      });
      const data = await res.json();
      if (!res.ok || !data.personalized) {
        setPersonalized((prev) => ({
          ...prev,
          [articleId]: {
            title: "",
            summary: data.error || "개인화에 실패했습니다. API 키를 확인해주세요.",
            loading: false,
            error: true,
          },
        }));
        return;
      }
      setPersonalized((prev) => ({
        ...prev,
        [articleId]: {
          title: data.personalized.personalizedTitle,
          summary: data.personalized.personalizedSummary,
          loading: false,
        },
      }));
    } catch {
      setPersonalized((prev) => ({
        ...prev,
        [articleId]: {
          title: "",
          summary: "네트워크 오류가 발생했습니다.",
          loading: false,
          error: true,
        },
      }));
    }
  };

  if (articles.length === 0 && loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse text-lg">뉴스를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">
            <span className="text-blue-500">My</span>News
          </h1>
          <div className="flex gap-2">
            {profile.interests.slice(0, 2).map((interest) => (
              <span key={interest} className="text-xs bg-zinc-800 px-2 py-1 rounded-full text-zinc-400">
                {interest}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Feed */}
      <div className="snap-y snap-mandatory overflow-y-auto" style={{ height: "calc(100vh - 56px)" }}>
        {articles.map((article) => (
          <FeedCard
            key={article.article_id}
            articleId={article.article_id}
            title={article.title}
            summary={article.summary || ""}
            categoryName={article.category_name || "뉴스"}
            imageUrl={article.image_url || undefined}
            serviceDatetime={article.service_daytime}
            likeCount={article.like_count}
            commentCount={article.comment_count}
            onPersonalize={handlePersonalize}
            personalizedTitle={personalized[article.article_id]?.title || undefined}
            personalizedSummary={personalized[article.article_id]?.summary || undefined}
            isPersonalizing={personalized[article.article_id]?.loading}
            hasError={personalized[article.article_id]?.error}
          />
        ))}

        {/* Infinite scroll trigger */}
        <div ref={observerRef} className="h-20 flex items-center justify-center">
          {loading && <div className="text-zinc-500 animate-pulse">더 불러오는 중...</div>}
          {!hasMore && <div className="text-zinc-600 text-sm">모든 기사를 불러왔습니다</div>}
        </div>
      </div>
    </div>
  );
}
