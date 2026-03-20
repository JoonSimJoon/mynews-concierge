import type { OnboardingStep } from "@/types";
import { PRIMARY_PROFESSION_OPTIONS, getProfessionConfig } from "@/lib/professions";

/** 카테고리 색상 매핑 */
export const CATEGORY_COLORS: Record<string, string> = {
  경제: "#2563eb",
  증권: "#dc2626",
  기업: "#059669",
  부동산: "#d97706",
  정치: "#7c3aed",
  사회: "#0891b2",
  국제: "#4f46e5",
  문화: "#ec4899",
  "IT·과학": "#06b6d4",
  스포츠: "#16a34a",
  스타투데이: "#f43f5e",
  오피니언: "#6b7280",
};

/** 온보딩 질문 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    step: 1,
    question: "어떤 뉴스에 관심이 많으세요?",
    description: "관심 분야를 5개까지 선택해주세요",
    field: "interests",
    options: [
      { value: "경제", label: "경제", description: "정책, 금융, 재테크" },
      { value: "증권", label: "증권", description: "주식, 펀드, 시황" },
      { value: "기업", label: "기업", description: "경영, 산업, 스타트업" },
      { value: "부동산", label: "부동산", description: "아파트, 분양, 정책" },
      { value: "정치", label: "정치", description: "국내정치, 외교, 국방" },
      { value: "사회", label: "사회", description: "사건사고, 교육, 복지" },
      { value: "국제", label: "국제", description: "세계뉴스, 글로벌경제" },
      { value: "문화", label: "문화", description: "공연, 영화, 여행" },
      { value: "IT·과학", label: "IT·과학", description: "AI, 모바일, 과학" },
      { value: "스포츠", label: "스포츠", description: "축구, 야구, 골프" },
    ],
  },
  {
    step: 2,
    question: "뉴스를 어떤 톤으로 읽고 싶으세요?",
    description: "선호하는 문체를 골라주세요",
    field: "writingStyle",
    options: [
      { value: "formal", label: "격식체", description: "~합니다. 객관적이고 진지하게" },
      { value: "casual", label: "편한 말투", description: "~해요. 친구랑 대화하듯이" },
      { value: "concise", label: "핵심만", description: "짧고 굵게. 바쁜 당신을 위해" },
      { value: "detailed", label: "상세하게", description: "배경부터 맥락까지 풍부하게" },
    ],
  },
  {
    step: 3,
    question: "뉴스 용어가 어느 정도 익숙하세요?",
    description: "설명의 깊이를 맞춰드릴게요",
    field: "knowledgeLevel",
    options: [
      { value: "expert", label: "전문가", description: "업계 용어도 OK. 심층 분석 원해요" },
      { value: "general", label: "일반인", description: "기본은 알지만 어려운 건 풀어주세요" },
      { value: "beginner", label: "입문자", description: "쉽게 설명해주세요. 배우는 중이에요" },
    ],
  },
  {
    step: 4,
    question: "정치/경제 이슈, 어떤 시각이 편하세요?",
    description: "뉴스 해석의 균형점을 맞춰드릴게요",
    field: "politicalStance",
    options: [
      { value: 2, label: "진보적", description: "사회적 형평성, 복지 확대 관점" },
      { value: 4, label: "중도 진보", description: "균형 잡히되 진보적 가치 중시" },
      { value: 5, label: "중도", description: "양쪽 시각을 균형 있게" },
      { value: 7, label: "중도 보수", description: "균형 잡히되 시장/안보 중시" },
      { value: 9, label: "보수적", description: "시장 자유, 안보 중심 관점" },
    ],
  },
  {
    step: 5,
    question: "마지막으로, 지금 무엇을 하고 계세요?",
    description: "뉴스를 당신의 상황에 맞춰 전달할게요",
    field: "occupation",
    options: PRIMARY_PROFESSION_OPTIONS.map((occupation) => {
      const config = getProfessionConfig(occupation);
      return {
        value: occupation,
        label: config.label,
        description: config.summary,
      };
    }),
  },
];
