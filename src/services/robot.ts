/**
 * ReachyKiwi 로봇 제어 서비스
 *
 * 핵심 제약: 제스처(play_*)가 실행 중이면 vel=0을 강제 설정하므로,
 * move/look은 반드시 제스처가 끝난 후에 보내야 한다.
 *
 * 제스처 소요 시간:
 *   wake_up: 2.5s, goto_sleep: 2.5s, dance: 2.5s
 *   nod_yes: 1.4s, shake_no: 1.4s, confused: 1.5s, impatient: 1.5s, count: 2.0s
 *
 * Available: wake_up, goto_sleep, dance, nod_yes, shake_no, confused, impatient, count
 * Movement: omniwheel x/y/theta (deg/s for theta, m/s for x/y)
 * Look: head yaw/pitch via goto API
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

function lookDirection(yaw: number, pitch: number = 0): Promise<boolean> {
  return robotPost("/api/move/goto", {
    target_head_pose: { xyzrpy: { yaw, pitch } },
    duration: 0.6,
    interpolation_mode: "minjerk",
  });
}

// ─── Types ───────────────────────────────────────────────────────

export type SequenceType = "morning" | "lunch" | "leaving";

export interface ChoreographyStep {
  delayMs: number;
  action: "gesture" | "move" | "stop" | "look";
  gesture?: string;
  move?: { x: number; y: number; theta: number };
  look?: { yaw: number; pitch: number };
  description: string;
}

// ═══════════════════════════════════════════════════════════════════
// MORNING (~35s)
// Rule: move/look ONLY after gesture finishes
// ═══════════════════════════════════════════════════════════════════

const MORNING_TIMELINE: ChoreographyStep[] = [
  // wake_up (2.5s) → move after 3s
  { delayMs: 0,     action: "gesture", gesture: "wake_up",     description: "기상!" },
  { delayMs: 3000,  action: "move",    move: { x: 0, y: 0, theta: 30 },  description: "스핀 등장" },
  { delayMs: 4200,  action: "stop",    description: "스핀 멈춤" },
  { delayMs: 4400,  action: "move",    move: { x: 0.18, y: 0, theta: 0 }, description: "전진 접근" },
  { delayMs: 5600,  action: "stop",    description: "도착" },
  { delayMs: 5800,  action: "look",    look: { yaw: 0, pitch: -0.25 },    description: "올려다보기" },

  // nod_yes (1.4s) → next after 7.5s
  { delayMs: 6000,  action: "gesture", gesture: "nod_yes",     description: "좋은 아침 인사" },
  // impatient (1.5s) → next after 9.2s
  { delayMs: 7700,  action: "gesture", gesture: "impatient",   description: "준비됐어요!" },

  // News #1: count (2s) — move before gesture
  { delayMs: 9500,  action: "look",    look: { yaw: 0.35, pitch: -0.1 },  description: "좌측 응시" },
  { delayMs: 10000, action: "gesture", gesture: "count",       description: "첫째!" },
  // count ends ~12s → move at 12.2s
  { delayMs: 12200, action: "move",    move: { x: 0.05, y: 0, theta: 0 }, description: "살짝 앞으로" },
  { delayMs: 13000, action: "stop",    description: "멈춤" },
  { delayMs: 13200, action: "look",    look: { yaw: 0, pitch: -0.2 },     description: "정면" },
  { delayMs: 13500, action: "gesture", gesture: "nod_yes",     description: "중요해요" },

  // News #2: strafe → count → confused
  // nod ends ~14.9s → move at 15.2s
  { delayMs: 15200, action: "move",    move: { x: 0, y: 0.12, theta: 0 }, description: "옆 슬라이드" },
  { delayMs: 16200, action: "stop",    description: "멈춤" },
  { delayMs: 16400, action: "look",    look: { yaw: -0.3, pitch: 0 },     description: "우측 응시" },
  { delayMs: 16800, action: "gesture", gesture: "count",       description: "둘째!" },
  // count ends ~18.8s
  { delayMs: 19000, action: "gesture", gesture: "confused",    description: "이건 좀 복잡한데" },
  // confused ends ~20.5s
  { delayMs: 20700, action: "look",    look: { yaw: 0, pitch: -0.15 },    description: "정면" },
  { delayMs: 21000, action: "gesture", gesture: "nod_yes",     description: "이해하시면 돼요" },

  // News #3: back up → count → impatient → approach
  // nod ends ~22.4s → move at 22.6s
  { delayMs: 22600, action: "move",    move: { x: -0.08, y: 0, theta: 0 }, description: "후퇴" },
  { delayMs: 23400, action: "stop",    description: "멈춤" },
  { delayMs: 23600, action: "look",    look: { yaw: 0.2, pitch: -0.25 },  description: "좌상 올려보기" },
  { delayMs: 24000, action: "gesture", gesture: "count",       description: "셋째!" },
  // count ends ~26s
  { delayMs: 26200, action: "gesture", gesture: "impatient",   description: "꼭 보셔야 해요!" },
  // impatient ends ~27.7s → move at 28s
  { delayMs: 28000, action: "move",    move: { x: 0.08, y: 0, theta: 0 }, description: "다시 가까이" },
  { delayMs: 28800, action: "stop",    description: "멈춤" },
  { delayMs: 29000, action: "gesture", gesture: "shake_no",    description: "놓치면 안 돼요" },
  // shake ends ~30.4s
  { delayMs: 30600, action: "look",    look: { yaw: 0, pitch: -0.2 },     description: "정면" },
  { delayMs: 31000, action: "gesture", gesture: "nod_yes",     description: "확인" },

  // Wrap up: spin → dance
  // nod ends ~32.4s → move at 32.6s
  { delayMs: 32600, action: "move",    move: { x: 0, y: 0, theta: -30 }, description: "역스핀" },
  { delayMs: 33600, action: "stop",    description: "멈춤" },
  { delayMs: 33800, action: "look",    look: { yaw: 0, pitch: -0.15 },    description: "정면" },
  { delayMs: 34000, action: "gesture", gesture: "dance",       description: "좋은 하루!" },
  // safety stop
  { delayMs: 37000, action: "stop",    description: "안전 정지" },
];

// ═══════════════════════════════════════════════════════════════════
// LUNCH (~22s)
// ═══════════════════════════════════════════════════════════════════

const LUNCH_TIMELINE: ChoreographyStep[] = [
  // dance (2.5s) → move after 3s
  { delayMs: 0,     action: "gesture", gesture: "dance",       description: "점심 댄스!" },
  { delayMs: 3000,  action: "move",    move: { x: 0.1, y: 0.12, theta: 0 }, description: "대각선 접근" },
  { delayMs: 4500,  action: "stop",    description: "도착" },
  { delayMs: 4700,  action: "look",    look: { yaw: 0, pitch: -0.2 },     description: "바라보기" },
  // impatient (1.5s)
  { delayMs: 5000,  action: "gesture", gesture: "impatient",   description: "밥 먹을 시간!" },

  // Summary: count (2s)
  // impatient ends ~6.5s
  { delayMs: 6800,  action: "look",    look: { yaw: 0.3, pitch: 0 },      description: "좌측" },
  { delayMs: 7200,  action: "gesture", gesture: "count",       description: "오전 핵심" },
  // count ends ~9.2s → move
  { delayMs: 9500,  action: "move",    move: { x: 0, y: -0.08, theta: 0 }, description: "반대 슬라이드" },
  { delayMs: 10300, action: "stop",    description: "멈춤" },
  { delayMs: 10500, action: "look",    look: { yaw: -0.2, pitch: -0.1 },  description: "우측" },
  { delayMs: 10800, action: "gesture", gesture: "nod_yes",     description: "끄덕" },
  // nod ends ~12.2s
  { delayMs: 12500, action: "gesture", gesture: "confused",    description: "더 궁금한 건?" },
  // confused ends ~14s
  { delayMs: 14200, action: "look",    look: { yaw: 0, pitch: -0.15 },    description: "정면" },
  { delayMs: 14500, action: "gesture", gesture: "nod_yes",     description: "오케이" },

  // Outro: dance (no spin — TTS may end before stop fires)
  // nod ends ~15.9s
  { delayMs: 16200, action: "look",    look: { yaw: 0, pitch: -0.2 },     description: "정면" },
  { delayMs: 16500, action: "gesture", gesture: "dance",       description: "맛있게 드세요!" },
  // dance ends ~19s
  { delayMs: 19200, action: "gesture", gesture: "nod_yes",     description: "바이바이" },
  // safety stop at the very end
  { delayMs: 21000, action: "stop",    description: "안전 정지" },
];

// ═══════════════════════════════════════════════════════════════════
// LEAVING (~28s)
// ═══════════════════════════════════════════════════════════════════

const LEAVING_TIMELINE: ChoreographyStep[] = [
  // wake_up (2.5s) → move after 3s
  { delayMs: 0,     action: "gesture", gesture: "wake_up",     description: "활성화" },
  { delayMs: 3000,  action: "move",    move: { x: 0.1, y: 0, theta: 0 }, description: "천천히 접근" },
  { delayMs: 4500,  action: "stop",    description: "도착" },
  { delayMs: 4700,  action: "look",    look: { yaw: 0, pitch: -0.2 },     description: "바라보기" },
  // nod (1.4s)
  { delayMs: 5000,  action: "gesture", gesture: "nod_yes",     description: "수고하셨습니다" },

  // Reminder: impatient → count → shake
  // nod ends ~6.4s
  { delayMs: 6700,  action: "gesture", gesture: "impatient",   description: "잠깐만요!" },
  // impatient ends ~8.2s
  { delayMs: 8500,  action: "look",    look: { yaw: 0.25, pitch: 0 },     description: "좌측" },
  { delayMs: 8800,  action: "gesture", gesture: "count",       description: "남은 액션" },
  // count ends ~10.8s
  { delayMs: 11000, action: "look",    look: { yaw: 0, pitch: -0.15 },    description: "정면" },
  { delayMs: 11300, action: "gesture", gesture: "shake_no",    description: "아직 안 하셨죠?" },
  // shake ends ~12.7s → move
  { delayMs: 13000, action: "move",    move: { x: 0.04, y: 0, theta: 0 }, description: "한 발짝 강조" },
  { delayMs: 13700, action: "stop",    description: "멈춤" },
  { delayMs: 14000, action: "gesture", gesture: "confused",    description: "내일로 미루실 건가요?" },
  // confused ends ~15.5s
  { delayMs: 15800, action: "look",    look: { yaw: -0.2, pitch: 0 },     description: "우측" },
  { delayMs: 16200, action: "gesture", gesture: "nod_yes",     description: "내일 주목" },

  // Goodbye: nod → shake → retreat → dance → sleep
  // nod ends ~17.6s
  { delayMs: 17800, action: "look",    look: { yaw: 0, pitch: -0.2 },     description: "정면" },
  { delayMs: 18200, action: "gesture", gesture: "nod_yes",     description: "좋은 저녁 되세요" },
  // nod ends ~19.6s
  { delayMs: 19800, action: "gesture", gesture: "shake_no",    description: "꼭 확인하세요" },
  // shake ends ~21.2s → move
  { delayMs: 21500, action: "move",    move: { x: -0.12, y: 0, theta: 0 }, description: "후퇴" },
  { delayMs: 22800, action: "stop",    description: "멈춤" },
  { delayMs: 23000, action: "look",    look: { yaw: 0, pitch: 0.15 },     description: "고개 숙임" },
  { delayMs: 23300, action: "gesture", gesture: "dance",       description: "짧은 인사" },
  // dance ends ~25.8s
  { delayMs: 26000, action: "look",    look: { yaw: 0, pitch: 0 },        description: "정면" },
  { delayMs: 26300, action: "gesture", gesture: "goto_sleep",  description: "좋은 밤" },
  // safety stop
  { delayMs: 29000, action: "stop",    description: "안전 정지" },
];

// ─── API ─────────────────────────────────────────────────────────

export function getTimeline(type: SequenceType): ChoreographyStep[] {
  switch (type) {
    case "morning": return MORNING_TIMELINE;
    case "lunch":   return LUNCH_TIMELINE;
    case "leaving": return LEAVING_TIMELINE;
  }
}

export async function executeAction(step: {
  action: string;
  gesture?: string;
  move?: { x: number; y: number; theta: number };
  look?: { yaw: number; pitch: number };
}): Promise<boolean> {
  switch (step.action) {
    case "gesture":
      return step.gesture ? playGesture(step.gesture) : false;
    case "move":
      return step.move ? moveBase(step.move.x, step.move.y, step.move.theta) : false;
    case "stop":
      return stopBase();
    case "look":
      return step.look ? lookDirection(step.look.yaw, step.look.pitch) : false;
    default:
      return false;
  }
}

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
