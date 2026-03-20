import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { generatePersonalizedArticle } from "@/services/personalize";
import type { UserProfile } from "@/types";

export const dynamic = "force-dynamic";

/** POST /api/personalize { articleId, profile } */
export async function POST(request: NextRequest) {
  try {
    initDb();
    const db = getDb();
    const { articleId, profile } = (await request.json()) as {
      articleId: number;
      profile: UserProfile;
    };

    if (!articleId || !profile) {
      return NextResponse.json(
        { error: "articleId and profile are required" },
        { status: 400 }
      );
    }

    // 원본 기사 조회
    const article = db
      .prepare("SELECT title, body_text, main_category FROM articles WHERE article_id = ?")
      .get(articleId) as { title: string; body_text: string; main_category: string } | undefined;

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // 캐시 확인 (프로필 해시 기반)
    const profileHash = `${profile.politicalStance}-${profile.writingStyle}-${profile.knowledgeLevel}-${(profile.interests || []).sort().join(",")}`;
    const cached = db
      .prepare(
        `SELECT personalized_title, personalized_body, personalized_summary, tone, perspective
         FROM personalized_articles
         WHERE article_id = ? AND tone = ?`
      )
      .get(articleId, profileHash) as {
        personalized_title: string;
        personalized_body: string;
        personalized_summary: string;
        tone: string;
        perspective: string;
      } | undefined;

    if (cached) {
      return NextResponse.json({
        articleId,
        original: { title: article.title },
        personalized: {
          personalizedTitle: cached.personalized_title,
          personalizedBody: cached.personalized_body,
          personalizedSummary: cached.personalized_summary,
          tone: cached.tone,
          perspective: cached.perspective,
        },
        cached: true,
      });
    }

    // Claude API로 맞춤 기사 생성
    const result = await generatePersonalizedArticle(
      article.title,
      article.body_text,
      profile
    );

    // 캐시 저장
    try {
      db.prepare(
        `INSERT OR IGNORE INTO personalized_articles
         (article_id, profile_id, personalized_title, personalized_body, personalized_summary, tone, perspective)
         VALUES (?, 1, ?, ?, ?, ?, ?)`
      ).run(
        articleId,
        result.personalizedTitle,
        result.personalizedBody,
        result.personalizedSummary,
        profileHash,
        result.perspective
      );
    } catch {
      // cache save failure is non-critical
    }

    return NextResponse.json({
      articleId,
      original: { title: article.title },
      personalized: result,
    });
  } catch (error) {
    console.error("Personalize error:", error);
    return NextResponse.json(
      { error: "Failed to personalize article" },
      { status: 500 }
    );
  }
}
