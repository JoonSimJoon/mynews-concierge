import { NextRequest, NextResponse } from "next/server";
import { executeAction } from "@/services/robot";

export const dynamic = "force-dynamic";

/** POST /api/robot/action { action, gesture?, move? } — 단일 로봇 액션 (thin proxy) */
export async function POST(request: NextRequest) {
  try {
    const { action, gesture, move, look } = (await request.json()) as {
      action: string;
      gesture?: string;
      move?: { x: number; y: number; theta: number };
      look?: { yaw: number; pitch: number };
    };

    if (!["gesture", "move", "stop", "look"].includes(action)) {
      return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    }

    const ok = await executeAction({ action, gesture, move, look });
    return NextResponse.json({ ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
