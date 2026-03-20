import type { Occupation, UserProfile } from "@/types";

export interface ProfessionConfig {
  occupation: Occupation;
  label: string;
  honorific: string;
  summary: string;
  keywords: string[];
  focusAreas: string[];
}

export const PROFESSION_CONFIGS: Record<Occupation, ProfessionConfig> = {
  doctor_owner: {
    occupation: "doctor_owner",
    label: "병원 원장",
    honorific: "원장님",
    summary: "의료정책, 수가, 인건비, 자산관리에 민감한 전문직",
    keywords: ["의료", "병원", "수가", "의대", "보건", "진료", "건보", "복지부"],
    focusAreas: ["병원 운영", "인건비", "수가", "대출", "자산관리"],
  },
  tax_accounting: {
    occupation: "tax_accounting",
    label: "세무/회계 전문가",
    honorific: "세무사님",
    summary: "세제, 기업 규제, 재무 흐름에 민감한 실무 전문가",
    keywords: ["세제", "세금", "법인세", "부가세", "재무", "회계", "감사"],
    focusAreas: ["세제 변화", "기업 재무", "고객 대응", "규제"],
  },
  lawyer: {
    occupation: "lawyer",
    label: "변호사",
    honorific: "변호사님",
    summary: "규제, 입법, 판례, 정책 변화에 민감한 법률 전문가",
    keywords: ["법안", "규제", "판결", "입법", "행정", "수사", "검찰", "법원"],
    focusAreas: ["규제 변화", "입법", "법률 리스크", "고객 자문"],
  },
  executive: {
    occupation: "executive",
    label: "임원/경영진",
    honorific: "대표님",
    summary: "거시경제, 산업동향, 투자 판단에 민감한 의사결정자",
    keywords: ["금리", "환율", "투자", "산업", "채용", "수출", "경영"],
    focusAreas: ["전략", "현금흐름", "인재", "시장 변화"],
  },
  smb_owner: {
    occupation: "smb_owner",
    label: "중소기업 대표",
    honorific: "대표님",
    summary: "운영비, 인건비, 공급망, 정책 지원에 민감한 사업 운영자",
    keywords: ["중소기업", "소상공인", "지원금", "인건비", "공급망", "원가"],
    focusAreas: ["운영비", "지원 정책", "인력", "매출"],
  },
  investor_professional: {
    occupation: "investor_professional",
    label: "전업/전문 투자자",
    honorific: "대표님",
    summary: "금리, 증시, 기업 실적, 자산시장 변화에 민감한 투자자",
    keywords: ["증시", "주가", "실적", "환율", "채권", "금리", "부동산", "투자"],
    focusAreas: ["포트폴리오", "시장 변동성", "금리", "기업 실적"],
  },
  student: {
    occupation: "student",
    label: "학생",
    honorific: "사용자님",
    summary: "학업과 진로 중심으로 뉴스를 소비하는 사용자",
    keywords: ["교육", "장학", "청년", "채용"],
    focusAreas: ["학업", "진로", "청년 정책"],
  },
  office_worker: {
    occupation: "office_worker",
    label: "직장인",
    honorific: "사용자님",
    summary: "업무와 자산관리 관점으로 뉴스를 보는 사용자",
    keywords: ["연봉", "직장", "인사", "채용", "경제"],
    focusAreas: ["업무", "연봉", "자산관리"],
  },
  self_employed: {
    occupation: "self_employed",
    label: "자영업자",
    honorific: "사장님",
    summary: "매출, 비용, 임대료, 지원정책에 민감한 사용자",
    keywords: ["자영업", "소상공인", "임대료", "매출", "지원"],
    focusAreas: ["매출", "비용", "지원 정책"],
  },
  investor: {
    occupation: "investor",
    label: "투자자",
    honorific: "사용자님",
    summary: "시장과 자산 흐름 중심으로 뉴스를 소비하는 사용자",
    keywords: ["주식", "펀드", "시장", "실적", "금리"],
    focusAreas: ["시장", "포트폴리오", "금리"],
  },
  job_seeker: {
    occupation: "job_seeker",
    label: "취업준비생",
    honorific: "사용자님",
    summary: "채용시장과 산업 전망 중심으로 뉴스를 소비하는 사용자",
    keywords: ["채용", "취업", "청년", "산업"],
    focusAreas: ["채용", "산업 전망", "진로"],
  },
  professional: {
    occupation: "professional",
    label: "전문직",
    honorific: "선생님",
    summary: "전문 지식과 실무 영향을 중심으로 뉴스를 소비하는 사용자",
    keywords: ["정책", "규제", "산업", "전문"],
    focusAreas: ["실무 영향", "정책 변화", "자산관리"],
  },
  retired: {
    occupation: "retired",
    label: "은퇴자",
    honorific: "선생님",
    summary: "연금과 자산 보전 중심으로 뉴스를 소비하는 사용자",
    keywords: ["연금", "건강", "부동산", "금리"],
    focusAreas: ["노후", "자산 보전", "건강"],
  },
  other: {
    occupation: "other",
    label: "기타",
    honorific: "사용자님",
    summary: "일반 생활과 관심사 중심으로 뉴스를 소비하는 사용자",
    keywords: ["정책", "경제", "사회"],
    focusAreas: ["일상 영향", "기본 정보"],
  },
};

export const PRIMARY_PROFESSION_OPTIONS = [
  "doctor_owner",
  "tax_accounting",
  "lawyer",
  "executive",
  "smb_owner",
  "investor_professional",
] as const satisfies Occupation[];

export const DEMO_PROFILE: UserProfile = {
  userId: 1,
  politicalStance: 5,
  interests: ["경제", "기업", "부동산"],
  writingStyle: "formal",
  knowledgeLevel: "general",
  ageGroup: "40s",
  occupation: "doctor_owner",
};

export function getProfessionConfig(occupation?: Occupation): ProfessionConfig {
  if (occupation && PROFESSION_CONFIGS[occupation]) {
    return PROFESSION_CONFIGS[occupation];
  }
  return PROFESSION_CONFIGS.doctor_owner;
}
