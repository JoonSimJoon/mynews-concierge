import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getLatestHandoff } from "@/services/concierge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    initDb();
    const profileId = parseInt(request.nextUrl.searchParams.get("profileId") || "1");
    return NextResponse.json({ handoff: getLatestHandoff(profileId) });
  } catch (error) {
    console.error("Concierge latest handoff error:", error);
    return NextResponse.json({ error: "Failed to load handoff" }, { status: 500 });
  }
}
