// MyNews Core Types

// === 사용자 프로파일링 ===

/** 정치 성향 스펙트럼 (1: 매우 진보 ~ 10: 매우 보수) */
export type PoliticalStance = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** 관심 분야 - 매경 중분류 기반 */
export type InterestCategory =
  | "경제"
  | "증권"
  | "기업"
  | "부동산"
  | "정치"
  | "사회"
  | "국제"
  | "문화"
  | "IT·과학"
  | "스포츠"
  | "스타투데이"
  | "오피니언";

/** 선호 문체 */
export type WritingStyle = "formal" | "casual" | "concise" | "detailed";

/** 배경지식 수준 */
export type KnowledgeLevel = "expert" | "general" | "beginner";

/** 연령대 */
export type AgeGroup = "10s" | "20s" | "30s" | "40s" | "50s" | "60s+";

/** 직업군 */
export type Occupation =
  | "doctor_owner"
  | "tax_accounting"
  | "lawyer"
  | "executive"
  | "smb_owner"
  | "investor_professional"
  | "student"
  | "office_worker"
  | "self_employed"
  | "investor"
  | "job_seeker"
  | "professional"
  | "retired"
  | "other";

/** 사용자 프로필 */
export interface UserProfile {
  id?: number;
  userId: number;
  politicalStance: PoliticalStance;
  interests: InterestCategory[];
  writingStyle: WritingStyle;
  knowledgeLevel: KnowledgeLevel;
  ageGroup?: AgeGroup;
  occupation?: Occupation;
}

// === 기사 데이터 ===

/** 원본 기사 */
export interface Article {
  id?: number;
  articleId: number;
  title: string;
  subTitle?: string;
  bodyHtml: string;
  bodyText: string;
  summary?: string;
  writers?: string;
  regDt?: string;
  serviceDatetime: string;
  pubDiv: "W" | "P";
  mainCategory: string;
  articleUrl?: string;
  imageUrl?: string;
  imageCaption?: string;
  likeCount: number;
  replyCount: number;
  commentCount: number;
}

/** 카테고리 */
export interface Category {
  largeCodeId: string;
  largeCodeNm: string;
  middleCodeId: string;
  middleCodeNm: string;
  smallCodeId: string;
  smallCodeNm: string;
}

/** 개인화된 기사 */
export interface PersonalizedArticle {
  id?: number;
  articleId: number;
  profileId: number;
  personalizedTitle: string;
  personalizedBody: string;
  personalizedSummary: string;
  tone?: string;
  perspective?: string;
  originalArticle?: Article;
}

/** 피드 카드 (UI 렌더링용) */
export interface FeedCard {
  articleId: number;
  personalizedTitle: string;
  personalizedSummary: string;
  categoryName: string;
  categoryColor: string;
  imageUrl?: string;
  serviceDatetime: string;
  likeCount: number;
  commentCount: number;
}

// === 온보딩 ===

/** 온보딩 질문 단계 */
export interface OnboardingStep {
  step: number;
  question: string;
  description: string;
  field: keyof UserProfile;
  options: OnboardingOption[];
}

/** 온보딩 선택지 */
export interface OnboardingOption {
  value: string | number;
  label: string;
  description?: string;
  icon?: string;
}

// === API 요청/응답 ===

export interface PersonalizeRequest {
  articleId: number;
  profile: UserProfile;
}

export interface PersonalizeResponse {
  personalizedTitle: string;
  personalizedBody: string;
  personalizedSummary: string;
  tone: string;
  perspective: string;
}

export interface DigestRequest {
  userId: number;
  period: "daily" | "weekly";
}

export interface DigestResponse {
  period: string;
  summary: string;
  topCategories: { category: string; count: number; percentage: number }[];
  trendKeywords: string[];
  articleCount: number;
}

export type ConciergeActionType = "save" | "remind";

export type ConciergeActionStatus = "pending" | "completed";

export type ActionPreset = "lunch" | "before_leave" | "tomorrow_morning";

export interface ConciergeBriefItem {
  articleId: number;
  title: string;
  category: string;
  oneSentenceSummary: string;
  whyItMatters: string;
  recommendedAction: string;
  appDeepLink: string;
  spokenScript: string;
  relevanceScore: number;
  importanceScore: number;
  combinedScore: number;
}

export interface ConciergeActionItem {
  id: number;
  profileId: number;
  articleId: number;
  title: string;
  actionType: ConciergeActionType;
  note?: string | null;
  remindAt?: string | null;
  status: ConciergeActionStatus;
  createdAt: string;
}

export interface ConciergeHandoff {
  articleId: number;
  title: string;
  source: "brief" | "alert" | "ask";
  timestamp: string;
  appDeepLink: string;
}
