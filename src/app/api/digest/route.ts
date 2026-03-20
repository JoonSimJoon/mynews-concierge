import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { generateDigest } from "@/services/personalize";
import type { UserProfile } from "@/types";

export const dynamic = "force-dynamic";

/** POST /api/digest { period, profile } */
export async function POST(request: NextRequest) {
  try {
    initDb();
    const db = getDb();
    const { period, profile } = (await request.json()) as {
      period: "daily" | "weekly";
      profile: UserProfile;
    };

    const days = period === "daily" ? 1 : 7;
    const interests = profile.interests;

    let query: string;
    let params: (string | number)[];

    // 최근 기사의 최대 날짜를 기준으로 날짜 필터
    const latest = db.prepare("SELECT MAX(service_daytime) as max_dt FROM articles").get() as { max_dt: string };
    const maxDate = latest.max_dt?.slice(0, 10) || "2025-12-31";

    if (interests.length > 0) {
      const placeholders = interests.map(() => "?").join(",");
      query = `
        SELECT a.title, c.middle_code_nm as category
        FROM articles a
        LEFT JOIN categories c ON a.main_category = c.small_code_id
        WHERE c.middle_code_nm IN (${placeholders})
          AND a.service_daytime >= date(?, '-' || ? || ' days')
        ORDER BY a.service_daytime DESC
        LIMIT ?
      `;
      params = [...interests, maxDate, days, days * 20];
    } else {
      query = `
        SELECT a.title, c.middle_code_nm as category
        FROM articles a
        LEFT JOIN categories c ON a.main_category = c.small_code_id
        WHERE a.service_daytime >= date(?, '-' || ? || ' days')
        ORDER BY a.service_daytime DESC
        LIMIT ?
      `;
      params = [maxDate, days, days * 20];
    }

    const articles = db.prepare(query).all(...params) as { title: string; category: string }[];

    const digest = await generateDigest(articles, profile);

    return NextResponse.json({ digest, articleCount: articles.length, period });
  } catch (error) {
    console.error("Digest error:", error);
    return NextResponse.json({ error: "Failed to generate digest" }, { status: 500 });
  }
}
