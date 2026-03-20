/**
 * ReachyKiwi 로봇 제어 서비스
 * mynews에서 reachykiwi 데몬(:8090)을 HTTP로 직접 호출
 */

const ROBOT_URL = process.env.REACHYKIWI_URL || "http://localhost:8090";

async function robotPost(path: string, body?: object): Promise<boolean> {
  try {
    const res = await fetch(`${ROBOT_URL}${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function playGesture(name: string): Promise<boolean> {
  return robotPost(`/api/move/play/${name}`);
}

function moveBase(xVel: number, yVel: number, thetaVel: number): Promise<boolean> {
  return robotPost("/api/move/set_target", {
    target_base_velocity: { x_vel: xVel, y_vel: yVel, theta_vel: thetaVel },
  });
}

function stopBase(): Promise<boolean> {
  return moveBase(0, 0, 0);
}

// ─── Choreography Timeline ───────────────────────────────────────

export type SequenceType = "morning" | "lunch" | "leaving";

export interface ChoreographyStep {
  delayMs: number;
  action: "gesture" | "move" | "stop";
  gesture?: string;
  move?: { x: number; y: number; theta: number };
  description: string;
}

/** 아침 브리핑 (~30초 TTS 동안 로봇 동작) */
const MORNING_TIMELINE: ChoreographyStep[] = [
  { delayMs: 0,     action: "gesture", gesture: "wake_up",   description: "기상" },
  { delayMs: 2000,  action: "move",    move: { x: 0.15, y: 0, theta: 0 }, description: "접근" },
  { delayMs: 3500,  action: "stop",    description: "정지" },
  { delayMs: 4000,  action: "gesture", gesture: "nod_yes",   description: "인사" },
  { delayMs: 9000,  action: "gesture", gesture: "count",     description: "뉴스 카운팅" },
  { delayMs: 14000, action: "gesture", gesture: "nod_yes",   description: "두 번째 뉴스" },
  { delayMs: 18000, action: "gesture", gesture: "impatient", description: "집중 유도" },
  { delayMs: 22000, action: "gesture", gesture: "nod_yes",   description: "세 번째 뉴스" },
  { delayMs: 26000, action: "gesture", gesture: "count",     description: "마무리 정리" },
  { delayMs: 29000, action: "gesture", gesture: "nod_yes",   description: "마무리 인사" },
];

/** 점심 브리핑 (~15초 TTS) */
const LUNCH_TIMELINE: ChoreographyStep[] = [
  { delayMs: 0,     action: "gesture", gesture: "impatient", description: "점심 알림" },
  { delayMs: 2000,  action: "move",    move: { x: 0.15, y: 0, theta: 0 }, description: "접근" },
  { delayMs: 3200,  action: "stop",    description: "정지" },
  { delayMs: 3500,  action: "gesture", gesture: "nod_yes",   description: "인사" },
  { delayMs: 7000,  action: "gesture", gesture: "dance",     description: "분위기 전환" },
  { delayMs: 11000, action: "gesture", gesture: "nod_yes",   description: "마무리" },
];

/** 퇴근 브리핑 (~20초 TTS) */
const LEAVING_TIMELINE: ChoreographyStep[] = [
  { delayMs: 0,     action: "gesture", gesture: "wake_up",     description: "활성화" },
  { delayMs: 2000,  action: "move",    move: { x: 0.15, y: 0, theta: 0 }, description: "접근" },
  { delayMs: 3200,  action: "stop",    description: "정지" },
  { delayMs: 3500,  action: "gesture", gesture: "nod_yes",     description: "인사" },
  { delayMs: 8000,  action: "gesture", gesture: "shake_no",    description: "리마인드" },
  { delayMs: 13000, action: "gesture", gesture: "nod_yes",     description: "확인" },
  { delayMs: 17000, action: "gesture", gesture: "goto_sleep",  description: "퇴근 인사" },
];

/** 시퀀스별 타임라인 반환 */
export function getTimeline(type: SequenceType): ChoreographyStep[] {
  switch (type) {
    case "morning": return MORNING_TIMELINE;
    case "lunch":   return LUNCH_TIMELINE;
    case "leaving": return LEAVING_TIMELINE;
  }
}

/** 단일 액션 실행 (클라이언트에서 호출) */
export async function executeAction(step: { action: string; gesture?: string; move?: { x: number; y: number; theta: number } }): Promise<boolean> {
  switch (step.action) {
    case "gesture":
      return step.gesture ? playGesture(step.gesture) : false;
    case "move":
      return step.move ? moveBase(step.move.x, step.move.y, step.move.theta) : false;
    case "stop":
      return stopBase();
    default:
      return false;
  }
}

/** 로봇 연결 확인 */
export async function checkRobotConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${ROBOT_URL}/api/daemon/status`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
