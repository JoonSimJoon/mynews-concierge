import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/related?articleId=123 - 관련 기사 추천 */
export async function GET(request: NextRequest) {
  initDb();
  const db = getDb();

  const articleId = request.nextUrl.searchParams.get("articleId");
  if (!articleId) {
    return NextResponse.json({ error: "articleId is required" }, { status: 400 });
  }

  // 원본 기사의 카테고리와 키워드 기반 관련 기사 추천
  const original = db
    .prepare("SELECT main_category, title FROM articles WHERE article_id = ?")
    .get(parseInt(articleId)) as { main_category: string; title: string } | undefined;

  if (!original) {
    return NextResponse.json({ articles: [] });
  }

  // 같은 카테고리의 최근 기사 + 제목 유사도 기반
  const titleWords = original.title
    .replace(/[\[\]「」『』\(\)]/g, "")
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 3);

  let articles;
  if (titleWords.length > 0) {
    const titleConditions = titleWords.map(() => "a.title LIKE ?").join(" OR ");
    const titleParams = titleWords.map((w) => `%${w}%`);

    articles = db
      .prepare(
        `SELECT a.article_id, a.title, a.summary, a.service_daytime, a.image_url,
                c.middle_code_nm as category_name
         FROM articles a
         LEFT JOIN categories c ON a.main_category = c.small_code_id
         WHERE a.article_id != ? AND (a.main_category = ? OR ${titleConditions})
         ORDER BY a.service_daytime DESC
         LIMIT 5`
      )
      .all(parseInt(articleId), original.main_category, ...titleParams);
  } else {
    articles = db
      .prepare(
        `SELECT a.article_id, a.title, a.summary, a.service_daytime, a.image_url,
                c.middle_code_nm as category_name
         FROM articles a
         LEFT JOIN categories c ON a.main_category = c.small_code_id
         WHERE a.article_id != ? AND a.main_category = ?
         ORDER BY a.service_daytime DESC
         LIMIT 5`
      )
      .all(parseInt(articleId), original.main_category);
  }

  return NextResponse.json({ articles });
}
