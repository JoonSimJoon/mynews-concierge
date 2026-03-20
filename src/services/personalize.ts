/**
 * Claude API 기반 맞춤형 기사 생성 엔진
 */

import Anthropic from "@anthropic-ai/sdk";
import type { UserProfile, PersonalizeResponse } from "../types";

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  return new Anthropic({ apiKey });
}

/** 프로필 기반 시스템 프롬프트 생성 */
function buildSystemPrompt(profile: UserProfile): string {
  const stanceLabel =
    profile.politicalStance <= 3
      ? "진보적"
      : profile.politicalStance <= 7
        ? "중도적"
        : "보수적";

  const styleMap: Record<string, string> = {
    formal: "격식체(~합니다, ~입니다)로 작성. 객관적이고 권위 있는 톤.",
    casual: "비격식체(~해요, ~거든요)로 작성. 친근하고 대화하듯 설명.",
    concise: "핵심만 간결하게. 불필요한 수식어 제거. 짧은 문장 위주.",
    detailed: "풍부한 배경 설명과 맥락 제공. 관련 사례와 데이터 포함.",
  };

  const knowledgeMap: Record<string, string> = {
    expert:
      "전문 용어를 그대로 사용. 업계 맥락과 심층 분석 중심. 기초 설명 생략.",
    general:
      "핵심 전문 용어는 간단히 풀어서 설명. 일반인 눈높이에 맞춘 해석 제공.",
    beginner:
      "모든 전문 용어를 쉬운 말로 풀어 설명. 비유와 예시를 적극 활용. 배경지식 없이도 이해 가능하게.",
  };

  const ageContext: Record<string, string> = {
    "10s": "10대 학생 관점. 진로, 학업, 트렌드와 연결.",
    "20s": "20대 청년 관점. 취업, 재테크 입문, 사회 첫걸음과 연결.",
    "30s": "30대 관점. 커리어 성장, 내 집 마련, 자산 형성과 연결.",
    "40s": "40대 관점. 자녀 교육, 중간관리자, 자산 관리와 연결.",
    "50s": "50대 관점. 은퇴 준비, 건강, 자산 보전과 연결.",
    "60s+": "60대 이상 관점. 노후 생활, 건강, 사회 참여와 연결.",
  };

  const occupationContext: Record<string, string> = {
    student: "학생 → 학업·진로·장학금·캠퍼스 생활에 미치는 영향 강조",
    office_worker: "직장인 → 업무·연봉·복지·커리어에 미치는 영향 강조",
    self_employed: "자영업자 → 매출·임대료·규제·소상공인 지원에 미치는 영향 강조",
    investor: "투자자 → 시장·종목·수익률·포트폴리오에 미치는 영향 강조",
    job_seeker: "취업준비생 → 채용시장·산업전망·면접준비에 미치는 영향 강조",
    professional: "전문직 → 업계 동향·규제 변화·전문성 활용에 미치는 영향 강조",
    retired: "은퇴자 → 연금·건강·여가·재산 보전에 미치는 영향 강조",
    other: "일반적 생활 관점에서 영향 분석",
  };

  return `당신은 개인 맞춤형 뉴스 에디터 'MyNews AI'입니다.

## 사용자 프로필
- 정치 성향: ${stanceLabel} (${profile.politicalStance}/10)
- 관심 분야: ${profile.interests.join(", ")}
- 선호 문체: ${styleMap[profile.writingStyle]}
- 지식 수준: ${knowledgeMap[profile.knowledgeLevel]}
${profile.ageGroup ? `- 연령대: ${ageContext[profile.ageGroup]}` : ""}
${profile.occupation ? `- 직업: ${occupationContext[profile.occupation] || occupationContext.other}` : ""}

## 작성 규칙
1. 원본 기사의 팩트(사실관계)는 100% 유지
2. 사용자 성향에 맞는 관점과 해석 각도를 적용
3. 지식 수준에 맞는 배경 설명을 추가하거나 생략
4. 선호 문체로 자연스럽게 재작성
5. 사용자 직업/연령에 맞는 실생활 영향을 부각
6. 허위 정보를 추가하지 않음
7. 정치적 극단은 피하되, 사용자 성향에 맞는 프레이밍 제공

## 출력 형식
반드시 아래 JSON 형식으로만 응답:
{
  "personalizedTitle": "맞춤 제목 (사용자 관점에서 흥미를 끌 수 있는 제목)",
  "personalizedBody": "맞춤 본문 (300-500자)",
  "personalizedSummary": "핵심 요약 3줄 (각 줄 \\n으로 구분)",
  "tone": "적용된 톤 (예: 친근한 해설, 전문 분석, 쉬운 풀이 등)",
  "perspective": "적용된 관점 (예: 청년 투자자 관점, 자영업자 실생활 관점 등)"
}`;
}

/** 맞춤형 기사 생성 */
export async function generatePersonalizedArticle(
  articleTitle: string,
  articleBody: string,
  profile: UserProfile
): Promise<PersonalizeResponse> {
  const systemPrompt = buildSystemPrompt(profile);

  // 본문이 너무 길면 앞부분만 사용 (토큰 절약)
  const truncatedBody =
    articleBody.length > 2000 ? articleBody.slice(0, 2000) + "..." : articleBody;

  const message = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `다음 뉴스 기사를 내 프로필에 맞춰 재작성해주세요.

[원본 제목]
${articleTitle}

[원본 본문]
${truncatedBody}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    // JSON 블록 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]) as PersonalizeResponse;
  } catch {
    // 파싱 실패 시 폴백
    return {
      personalizedTitle: articleTitle,
      personalizedBody: text,
      personalizedSummary: text.slice(0, 150),
      tone: "원본",
      perspective: "일반",
    };
  }
}

/** 다이제스트 생성 */
export async function generateDigest(
  articles: { title: string; category: string }[],
  profile: UserProfile
): Promise<string> {
  const articleList = articles
    .slice(0, 20)
    .map((a, i) => `${i + 1}. [${a.category}] ${a.title}`)
    .join("\n");

  const message = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `당신은 뉴스 다이제스트 에디터입니다. 사용자의 관심 분야(${profile.interests.join(", ")})를 중심으로 뉴스를 요약합니다. ${profile.writingStyle === "formal" ? "격식체" : "비격식체"}로 작성합니다.`,
    messages: [
      {
        role: "user",
        content: `다음 기사 목록을 기반으로 오늘의 뉴스 다이제스트를 작성해주세요. 주요 이슈 3개를 선별하고 각각 2-3문장으로 요약해주세요.\n\n${articleList}`,
      },
    ],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}

/** 알림 문구 생성 */
export async function generateAlertMessage(
  articleTitle: string,
  keyword: string,
  profile: UserProfile
): Promise<string> {
  const message = await getClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `관심 키워드 "${keyword}"와 관련된 기사가 나왔습니다: "${articleTitle}". 이 기사에 대해 ${profile.writingStyle === "casual" ? "친근한" : "간결한"} 한 줄 알림 문구를 만들어주세요. 50자 이내로.`,
      },
    ],
  });

  return message.content[0].type === "text" ? message.content[0].text : articleTitle;
}
