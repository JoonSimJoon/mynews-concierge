import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/stats/categories */
export async function GET() {
  initDb();
  const db = getDb();

  const categories = db
    .prepare(
      `SELECT c.middle_code_nm as category_name, COUNT(*) as count
       FROM articles a
       LEFT JOIN categories c ON a.main_category = c.small_code_id
       WHERE c.middle_code_nm IS NOT NULL
       GROUP BY c.middle_code_nm
       ORDER BY count DESC
       LIMIT 15`
    )
    .all();

  return NextResponse.json({ categories });
}
