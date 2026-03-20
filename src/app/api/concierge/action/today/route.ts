import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getTodayActions } from "@/services/concierge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    initDb();
    const profileId = parseInt(request.nextUrl.searchParams.get("profileId") || "1");
    return NextResponse.json({ actions: getTodayActions(profileId) });
  } catch (error) {
    console.error("Concierge today action error:", error);
    return NextResponse.json({ error: "Failed to load today actions" }, { status: 500 });
  }
}
