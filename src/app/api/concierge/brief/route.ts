import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { buildMorningBrief } from "@/services/concierge";
import type { UserProfile } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    initDb();
    const { profileId = 1, profile } = (await request.json()) as {
      profileId?: number;
      profile?: UserProfile;
    };

    return NextResponse.json(buildMorningBrief(profileId, profile));
  } catch (error) {
    console.error("Concierge brief error:", error);
    return NextResponse.json({ error: "Failed to build concierge brief" }, { status: 500 });
  }
}
