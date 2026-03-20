import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/shorts?page=1&limit=5 - 사전 생성된 숏츠 목록 */
export async function GET(request: NextRequest) {
  initDb();
  const db = getDb();

  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "5");
  const offset = (page - 1) * limit;

  const shorts = db
    .prepare(
      `SELECT id, article_id, original_title, short_title, short_body,
              short_summary, tone, perspective, category_name, image_url,
              tts_voice, service_daytime, created_at,
              length(tts_audio) as audio_size
       FROM shorts
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);

  const total = (db.prepare("SELECT COUNT(*) as cnt FROM shorts").get() as { cnt: number }).cnt;

  return NextResponse.json({ shorts, total, page, limit });
}
