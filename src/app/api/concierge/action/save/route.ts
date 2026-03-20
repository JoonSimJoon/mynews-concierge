import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { createSavedAction } from "@/services/concierge";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    initDb();
    const { profileId = 1, articleId, note } = (await request.json()) as {
      profileId?: number;
      articleId?: number;
      note?: string;
    };

    if (!articleId) {
      return NextResponse.json({ error: "articleId is required" }, { status: 400 });
    }

    return NextResponse.json({ action: createSavedAction(profileId, articleId, note) });
  } catch (error) {
    console.error("Concierge save action error:", error);
    return NextResponse.json({ error: "Failed to save concierge action" }, { status: 500 });
  }
}
