"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_COLORS } from "@/lib/constants";
import TtsPlayer from "./TtsPlayer";

interface FeedCardProps {
  articleId: number;
  title: string;
  summary: string;
  categoryName: string;
  imageUrl?: string;
  serviceDatetime: string;
  likeCount: number;
  commentCount: number;
  onPersonalize: (articleId: number) => void;
  personalizedTitle?: string;
  personalizedSummary?: string;
  isPersonalizing?: boolean;
  hasError?: boolean;
}

export default function FeedCard({
  articleId,
  title,
  summary,
  categoryName,
  imageUrl,
  serviceDatetime,
  likeCount,
  commentCount,
  onPersonalize,
  personalizedTitle,
  personalizedSummary,
  isPersonalizing,
  hasError,
}: FeedCardProps) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const color = CATEGORY_COLORS[categoryName] || "#6b7280";
  const date = serviceDatetime?.slice(0, 10) || "";
  const isPersonalized = !!personalizedTitle;

  const goToDetail = () => router.push(`/article/${articleId}`);

  return (
    <div className="w-full max-w-md mx-auto snap-start shrink-0 h-[calc(100vh-80px)] flex flex-col p-4">
      <div className="flex-1 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex flex-col transition-transform duration-200 hover:scale-[1.01]">
        {/* Image */}
        {imageUrl && (
          <div className="h-48 overflow-hidden relative cursor-pointer" onClick={goToDetail}>
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col">
          {/* Category & Date */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: color + "20", color }}
            >
              {categoryName || "뉴스"}
            </span>
            <span className="text-xs text-zinc-500">{date}</span>
            {isPersonalized && (
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 ml-auto shadow-sm shadow-emerald-500/30">
                AI 맞춤
              </span>
            )}
          </div>

          {/* Title */}
          <h2
            className="text-xl font-bold leading-snug mb-3 cursor-pointer hover:text-blue-400 transition-colors"
            onClick={goToDetail}
          >
            {personalizedTitle || title}
          </h2>

          {/* Summary */}
          <p className={`text-sm leading-[1.75] ${hasError ? "text-red-400" : "text-zinc-400"} ${expanded ? "" : "line-clamp-4"}`}>
            {personalizedSummary || summary}
          </p>

          {summary && summary.length > 100 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-400 text-xs mt-2 self-start"
            >
              {expanded ? "접기" : "더 보기"}
            </button>
          )}

          {/* TTS Player */}
          {isPersonalized && personalizedSummary && (
            <div className="mt-3">
              <TtsPlayer
                text={personalizedSummary}
                title={personalizedTitle || title}
              />
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800 mt-4">
            <div className="flex gap-4 text-xs text-zinc-500">
              <span>♡ {likeCount}</span>
              <span>💬 {commentCount}</span>
            </div>
            <button
              onClick={() => onPersonalize(articleId)}
              disabled={isPersonalizing}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isPersonalizing
                  ? "bg-zinc-800 text-zinc-500"
                  : hasError
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : isPersonalized
                      ? "bg-emerald-600 text-white"
                      : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              {isPersonalizing ? "생성 중..." : hasError ? "재시도" : isPersonalized ? "맞춤 완료" : "AI 맞춤 읽기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
