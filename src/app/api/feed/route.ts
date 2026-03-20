import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/feed?interests=경제,증권&page=1&limit=10 */
export async function GET(request: NextRequest) {
  initDb();
  const db = getDb();

  const { searchParams } = request.nextUrl;
  const interests = searchParams.get("interests")?.split(",") || [];
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  let query: string;
  let params: (string | number)[];

  if (interests.length > 0) {
    const placeholders = interests.map(() => "?").join(",");
    query = `
      SELECT a.article_id, a.title, a.summary, a.service_daytime,
             a.main_category, a.image_url, a.like_count, a.comment_count,
             c.middle_code_nm as category_name
      FROM articles a
      LEFT JOIN categories c ON a.main_category = c.small_code_id
      WHERE c.middle_code_nm IN (${placeholders})
      ORDER BY a.service_daytime DESC
      LIMIT ? OFFSET ?
    `;
    params = [...interests, limit, offset];
  } else {
    query = `
      SELECT a.article_id, a.title, a.summary, a.service_daytime,
             a.main_category, a.image_url, a.like_count, a.comment_count,
             c.middle_code_nm as category_name
      FROM articles a
      LEFT JOIN categories c ON a.main_category = c.small_code_id
      ORDER BY a.service_daytime DESC
      LIMIT ? OFFSET ?
    `;
    params = [limit, offset];
  }

  const articles = db.prepare(query).all(...params);

  return NextResponse.json({ articles, page, limit });
}
