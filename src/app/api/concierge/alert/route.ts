import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { buildBreakingAlert } from "@/services/concierge";
import type { UserProfile } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    initDb();
    const { profileId = 1, profile, articleId, since } = (await request.json()) as {
      profileId?: number;
      profile?: UserProfile;
      articleId?: number;
      since?: string;
    };

    return NextResponse.json(buildBreakingAlert(profileId, articleId, since, profile));
  } catch (error) {
    console.error("Concierge alert error:", error);
    return NextResponse.json({ error: "Failed to evaluate concierge alert" }, { status: 500 });
  }
}
