import { NextRequest, NextResponse } from "next/server";
import { getTimeline, checkRobotConnection, type SequenceType } from "@/services/robot";
import { initDb } from "@/lib/db";
import { buildMorningBrief, getTodayActions } from "@/services/concierge";

export const dynamic = "force-dynamic";

/** POST /api/robot/sequence { type, profileId? } → script + timeline (로봇 시퀀스는 클라이언트가 구동) */
export async function POST(request: NextRequest) {
  try {
    initDb();
    const { type, profileId = 1 } = (await request.json()) as {
      type: SequenceType;
      profileId?: number;
    };

    if (!["morning", "lunch", "leaving"].includes(type)) {
      return NextResponse.json({ error: "Invalid sequence type" }, { status: 400 });
    }

    const robotConnected = await checkRobotConnection();

    // 뉴스 데이터 준비
    let briefing = null;
    let pendingActions = null;

    if (type === "morning" || type === "lunch") {
      briefing = buildMorningBrief(profileId);
    }

    if (type === "leaving") {
      pendingActions = getTodayActions(profileId).filter((a) => a.status === "pending");
      briefing = buildMorningBrief(profileId);
    }

    // 타임라인 반환 (클라이언트가 TTS와 동시에 실행)
    const timeline = robotConnected ? getTimeline(type) : [];

    // 브리핑 스크립트 생성
    let script = "";
    if (type === "morning" && briefing) {
      if (briefing.robotScript) {
        script = briefing.robotScript;
      } else {
        const body = briefing.items.map((item) =>
          `${item.title}. ${item.whyItMatters} ${item.recommendedAction}`
        ).join(" 다음은, ");
        script = `${briefing.greeting} ${body} 자세한 내용은 앱에서 확인하실 수 있습니다.`;
      }
    } else if (type === "lunch" && briefing) {
      const top = briefing.items[0];
      script = top
        ? `점심시간입니다. 오전 가장 중요했던 뉴스는, ${top.title}. ${top.whyItMatters}`
        : "점심시간입니다. 오전에 특별히 중요한 뉴스는 없었습니다.";
    } else if (type === "leaving") {
      const pendingCount = pendingActions?.length || 0;
      if (pendingCount > 0) {
        const titles = pendingActions!.slice(0, 2).map((a) => a.title).join(", ");
        script = `퇴근 전 확인하세요. 아직 완료하지 않은 액션이 ${pendingCount}건 있습니다. ${titles}. 내일도 좋은 하루 되세요.`;
      } else {
        script = "오늘 등록된 액션을 모두 완료하셨습니다. 수고하셨습니다. 내일도 좋은 하루 되세요.";
      }
    }

    return NextResponse.json({
      type,
      robotConnected,
      script,
      timeline,
      briefing: type !== "leaving" ? briefing : null,
      pendingActions: type === "leaving" ? pendingActions : null,
    });
  } catch (error) {
    console.error("Robot sequence error:", error);
    return NextResponse.json({ error: "Failed to run robot sequence" }, { status: 500 });
  }
}

/** GET /api/robot/sequence — 로봇 연결 상태 확인 */
export async function GET() {
  const connected = await checkRobotConnection();
  return NextResponse.json({
    connected,
    url: process.env.REACHYKIWI_URL || "http://localhost:8090",
  });
}
