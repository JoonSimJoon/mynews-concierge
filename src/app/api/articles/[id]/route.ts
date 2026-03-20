import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/articles/:id */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  initDb();
  const db = getDb();
  const { id } = await params;

  const article = db
    .prepare(
      `SELECT a.*, c.middle_code_nm as category_name, c.large_code_nm as large_category
       FROM articles a
       LEFT JOIN categories c ON a.main_category = c.small_code_id
       WHERE a.article_id = ?`
    )
    .get(parseInt(id));

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  return NextResponse.json(article);
}
