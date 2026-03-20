import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/articles?page=1&limit=20&category=경제 */
export async function GET(request: NextRequest) {
  initDb();
  const db = getDb();

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const category = searchParams.get("category");
  const offset = (page - 1) * limit;

  let query = `
    SELECT a.article_id, a.title, a.summary, a.body_text, a.service_daytime,
           a.main_category, a.image_url, a.like_count, a.reply_count, a.comment_count, a.writers,
           c.middle_code_nm as category_name
    FROM articles a
    LEFT JOIN categories c ON a.main_category = c.small_code_id
  `;
  const params: (string | number)[] = [];

  if (category) {
    query += " WHERE c.middle_code_nm = ?";
    params.push(category);
  }

  query += " ORDER BY a.service_daytime DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const articles = db.prepare(query).all(...params);

  const countQuery = category
    ? "SELECT COUNT(*) as total FROM articles a LEFT JOIN categories c ON a.main_category = c.small_code_id WHERE c.middle_code_nm = ?"
    : "SELECT COUNT(*) as total FROM articles";
  const countParams = category ? [category] : [];
  const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

  return NextResponse.json({
    articles,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
