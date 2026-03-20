import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { generateAlertMessage } from "@/services/personalize";
import type { UserProfile } from "@/types";

export const dynamic = "force-dynamic";

/** POST /api/alerts/check { keywords, profile } */
export async function POST(request: NextRequest) {
  try {
    initDb();
    const db = getDb();
    const { keywords, profile } = (await request.json()) as {
      keywords: string[];
      profile: UserProfile;
    };

    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ alerts: [] });
    }

    // 최근 기사에서 키워드 매칭
    const results: { articleId: number; title: string; keyword: string; alertMessage: string }[] = [];

    for (const keyword of keywords.slice(0, 5)) {
      const articles = db
        .prepare(
          `SELECT article_id, title FROM articles
           WHERE title LIKE ?
           ORDER BY service_daytime DESC
           LIMIT 3`
        )
        .all(`%${keyword}%`) as { article_id: number; title: string }[];

      for (const article of articles) {
        const alertMessage = await generateAlertMessage(article.title, keyword, profile);
        results.push({
          articleId: article.article_id,
          title: article.title,
          keyword,
          alertMessage,
        });
      }
    }

    return NextResponse.json({ alerts: results });
  } catch (error) {
    console.error("Alert check error:", error);
    return NextResponse.json({ error: "Failed to check alerts" }, { status: 500 });
  }
}
