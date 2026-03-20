import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { createReminderAction } from "@/services/concierge";
import type { ActionPreset } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    initDb();
    const { profileId = 1, articleId, preset, remindAt } = (await request.json()) as {
      profileId?: number;
      articleId?: number;
      preset?: ActionPreset;
      remindAt?: string;
    };

    if (!articleId) {
      return NextResponse.json({ error: "articleId is required" }, { status: 400 });
    }

    return NextResponse.json({
      action: createReminderAction(profileId, articleId, preset, remindAt),
    });
  } catch (error) {
    console.error("Concierge remind action error:", error);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}
