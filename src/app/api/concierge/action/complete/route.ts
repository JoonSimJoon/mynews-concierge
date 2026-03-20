import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { completeAction } from "@/services/concierge";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    initDb();
    const { actionId } = (await request.json()) as { actionId?: number };

    if (!actionId) {
      return NextResponse.json({ error: "actionId is required" }, { status: 400 });
    }

    completeAction(actionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Concierge complete action error:", error);
    return NextResponse.json({ error: "Failed to complete action" }, { status: 500 });
  }
}
