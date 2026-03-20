"use client";

import { useState } from "react";
import { getProfile } from "@/lib/profile-store";
import { CATEGORY_COLORS } from "@/lib/constants";
import Link from "next/link";

interface SearchResult {
  article_id: number;
  title: string;
  service_daytime: string;
  image_url?: string;
  category_name: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const profile = getProfile();

    try {
      const res = await fetch("/api/concierge/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: 1, profile, question: query, style: "short" }),
      });
      const data = await res.json();
      setAiAnswer(data.answer || data.spokenAnswer || "");
      setResults(data.articles || []);
      setFollowUps(data.followUpQuestions || []);
    } catch {
      setAiAnswer("");
      setResults([]);
      setFollowUps([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/" className="text-zinc-400 hover:text-white shrink-0">←</Link>
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="오늘 중요한 뉴스나 궁금한 이슈를 물어보세요..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 pr-12"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {loading ? "..." : "검색"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* AI Answer */}
        {aiAnswer && (
          <div className="bg-gradient-to-br from-blue-950/50 to-zinc-900 rounded-xl p-5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">Ask My News</span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line">{aiAnswer}</p>
          </div>
        )}

        {followUps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {followUps.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setQuery(item);
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
              >
                {item}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-zinc-500 mb-3">관련 기사 {results.length}건</h3>
            <div className="space-y-3">
              {results.map((article) => {
                const color = CATEGORY_COLORS[article.category_name] || "#6b7280";
                return (
                  <Link
                    key={article.article_id}
                    href={`/article/${article.article_id}`}
                    className="block bg-zinc-900 rounded-xl p-4 border border-zinc-800 hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex gap-3">
                      {article.image_url && (
                        <img
                          src={article.image_url}
                          alt=""
                          className="w-20 h-16 rounded-lg object-cover shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: color + "20", color }}>
                            {article.category_name}
                          </span>
                          <span className="text-[10px] text-zinc-600">{article.service_daytime?.slice(0, 10)}</span>
                        </div>
                        <h4 className="text-sm font-semibold leading-tight line-clamp-2">{article.title}</h4>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {searched && !loading && results.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            <p className="text-lg mb-2">검색 결과가 없습니다</p>
            <p className="text-sm">다른 키워드로 검색해보세요</p>
          </div>
        )}

        {/* Initial State */}
        {!searched && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2">Ask My News</h2>
            <p className="text-sm text-zinc-500">중요한 뉴스의 맥락과 영향을<br/>질문형으로 바로 확인해보세요</p>
            <div className="mt-6 space-y-2">
              {[
                "오늘 중요한 뉴스만 알려줘",
                "금리 변화가 내 자산에 왜 중요해?",
                "의료정책 변화 핵심만 설명해줘",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setQuery(suggestion); }}
                  className="block w-full text-left bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
