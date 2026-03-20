import { getDb } from "@/lib/db";
import { DEMO_PROFILE, getProfessionConfig } from "@/lib/professions";
import type {
  ActionPreset,
  ConciergeActionItem,
  ConciergeBriefItem,
  ConciergeHandoff,
  UserProfile,
} from "@/types";

type ConciergeSource = "brief" | "alert" | "ask";

interface ArticleCandidate {
  article_id: number;
  title: string;
  summary: string | null;
  body_text: string;
  service_daytime: string;
  main_category: string;
  image_url: string | null;
  like_count: number;
  comment_count: number;
  category_name: string | null;
}

interface ScoredArticle extends ConciergeBriefItem {
  matchedKeywords: string[];
  imageUrl?: string | null;
}

interface BriefResponse {
  greeting: string;
  items: ConciergeBriefItem[];
  totalSpokenDuration: number;
  robotScript: string;
}

interface AskResponse {
  answer: string;
  spokenAnswer: string;
  primaryArticleId?: number;
  sources: { articleId: number; title: string }[];
  articles: {
    article_id: number;
    title: string;
    category_name: string;
    service_daytime: string;
    image_url?: string | null;
  }[];
  followUpQuestions: string[];
}

interface AlertResponse {
  shouldAlert: boolean;
  articleId?: number;
  urgency: "high" | "medium";
  spokenAlert: string;
  shortExplanation: string;
  appDeepLink?: string;
  checkedUntil?: string;
}

const POLICY_KEYWORDS = [
  "세제",
  "세금",
  "규제",
  "정책",
  "법안",
  "개편",
  "인상",
  "인하",
  "금리",
  "기준금리",
  "지원책",
  "수가",
  "의료정책",
  "입법",
];

const URGENT_KEYWORDS = ["속보", "단독", "긴급", "발표", "확정"];

const QUESTION_STOPWORDS = [
  "오늘",
  "지금",
  "최근",
  "요즘",
  "뉴스",
  "기사",
  "속보",
  "중요",
  "중요한",
  "핵심",
  "브리핑",
  "정리",
  "요약",
  "설명",
  "비교",
  "무슨",
  "뭐",
  "뭐야",
  "뭐지",
  "알려줘",
  "말해줘",
  "보여줘",
  "나한테",
  "내게",
  "에게",
  "대한",
  "관련",
  "기준",
];

const GENERIC_PRIORITY_PATTERNS = [
  "오늘 나한테 중요한 뉴스",
  "오늘 중요한 뉴스",
  "오늘 핵심 뉴스",
  "중요한 뉴스",
  "핵심 뉴스",
  "브리핑",
  "뉴스 정리",
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  경제: ["금리", "물가", "환율", "세제", "정책"],
  증권: ["증시", "주가", "실적", "상장", "투자"],
  기업: ["채용", "실적", "투자", "경영", "산업"],
  부동산: ["부동산", "분양", "전세", "대출", "재건축"],
  정치: ["정부", "국회", "대통령", "장관", "정책"],
  사회: ["복지", "교육", "의료", "노동", "안전"],
  국제: ["미국", "중국", "수출", "관세", "환율"],
  "IT·과학": ["AI", "반도체", "기술", "플랫폼", "데이터"],
};

const ACTION_PATTERNS: Array<{ keywords: string[]; action: string }> = [
  { keywords: ["금리", "대출", "기준금리"], action: "대출 조건과 고정금리를 확인해보세요." },
  { keywords: ["세제", "세금", "법인세", "부가세"], action: "적용 시점과 대상 범위를 확인해보세요." },
  { keywords: ["의료", "수가", "병원"], action: "기관 운영 기준과 수가 변동 여부를 확인해보세요." },
  { keywords: ["부동산", "대출", "분양"], action: "보유 자산과 대출 계획 영향을 점검해보세요." },
  { keywords: ["채용", "인건비", "노동"], action: "인력 계획과 비용 영향을 검토해보세요." },
  { keywords: ["실적", "투자", "증시"], action: "보유 종목과 포트폴리오 영향을 확인해보세요." },
];

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeText(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function matchedKeywords(text: string, keywords: string[]): string[] {
  return keywords.filter((keyword) => text.includes(keyword));
}

function buildQuestionKeywords(question: string): string[] {
  return question
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1)
    .filter((word) => !QUESTION_STOPWORDS.includes(word))
    .slice(0, 6);
}

function isGenericPriorityQuestion(question: string): boolean {
  const normalized = question.replace(/\s+/g, " ").trim();
  return GENERIC_PRIORITY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function getCategory(article: ArticleCandidate): string {
  return article.category_name || article.main_category || "뉴스";
}

function summarizeArticle(article: ArticleCandidate): string {
  const summary = normalizeText(article.summary);
  if (summary) {
    return summary.split("\n")[0].slice(0, 80);
  }

  const body = normalizeText(article.body_text);
  if (!body) {
    return article.title;
  }

  return body.slice(0, 80) + (body.length > 80 ? "..." : "");
}

function fallbackWhyItMatters(article: ArticleCandidate, profile: UserProfile): string {
  const profession = getProfessionConfig(profile.occupation);
  const text = `${article.title} ${article.body_text}`;
  if (containsAny(text, ["금리", "대출", "환율"])) {
    return `${profession.label}의 자금 계획과 자산 운영에 영향을 줄 수 있습니다.`;
  }
  if (containsAny(text, ["세제", "세금", "법인세", "부가세"])) {
    return `${profession.label}의 세무 대응과 비용 구조에 영향을 줄 수 있습니다.`;
  }
  if (containsAny(text, ["의료", "수가", "병원", "보건"])) {
    return `${profession.label}의 실무 기준과 운영 계획에 영향을 줄 수 있습니다.`;
  }
  if (containsAny(text, ["규제", "법안", "입법", "정부"])) {
    return `${profession.label}의 업무 기준과 의사결정에 영향을 줄 수 있습니다.`;
  }
  if (containsAny(text, ["실적", "투자", "증시", "주가"])) {
    return `${profession.label}의 투자 판단과 시장 대응에 영향을 줄 수 있습니다.`;
  }

  return `${profession.focusAreas[0] || "업무 흐름"}과 관련해 체크가 필요한 이슈입니다.`;
}

function fallbackRecommendedAction(article: ArticleCandidate): string {
  const text = `${article.title} ${article.body_text}`;
  const matched = ACTION_PATTERNS.find((pattern) => containsAny(text, pattern.keywords));
  return matched?.action || "세부 적용 대상과 시점을 확인해보세요.";
}

function buildSpokenItem(item: ConciergeBriefItem): string {
  return `${item.title}. ${item.whyItMatters} ${item.recommendedAction}`;
}

function estimateSpokenDuration(text: string): number {
  return Math.max(15, Math.round(text.length / 8));
}

function buildRobotScript(items: ConciergeBriefItem[], profile: UserProfile): { greeting: string; script: string } {
  const profession = getProfessionConfig(profile.occupation);
  const greeting = `${profession.honorific}, 좋은 아침입니다. 오늘 꼭 확인하실 뉴스 ${items.length}건을 말씀드리겠습니다.`;
  const body = items
    .map((item, index) => {
      const prefix =
        index === 0 ? "첫째" : index === items.length - 1 ? "마지막으로" : "다음은";
      return `${prefix}, ${buildSpokenItem(item)}`;
    })
    .join(" ");

  return {
    greeting,
    script: `${greeting} ${body} 자세한 내용은 앱에서 바로 확인하실 수 있습니다.`,
  };
}

function loadRecentArticles(limit = 80, since?: string): ArticleCandidate[] {
  const db = getDb();
  const params: Array<string | number> = [];
  let where = "";

  if (since) {
    where = "WHERE a.service_daytime > ?";
    params.push(since);
  }

  params.push(limit);

  return db
    .prepare(
      `SELECT a.article_id, a.title, a.summary, a.body_text, a.service_daytime,
              a.main_category, a.image_url, a.like_count, a.comment_count,
              c.middle_code_nm as category_name
       FROM articles a
       LEFT JOIN categories c ON a.main_category = c.small_code_id
       ${where}
       ORDER BY a.service_daytime DESC
       LIMIT ?`
    )
    .all(...params) as ArticleCandidate[];
}

function loadArticleById(articleId: number): ArticleCandidate | null {
  const db = getDb();
  const article = db
    .prepare(
      `SELECT a.article_id, a.title, a.summary, a.body_text, a.service_daytime,
              a.main_category, a.image_url, a.like_count, a.comment_count,
              c.middle_code_nm as category_name
       FROM articles a
       LEFT JOIN categories c ON a.main_category = c.small_code_id
       WHERE a.article_id = ?`
    )
    .get(articleId) as ArticleCandidate | undefined;

  return article ?? null;
}

function searchArticles(question: string, contextArticleId?: number): ArticleCandidate[] {
  const db = getDb();
  const keywords = buildQuestionKeywords(question);

  if (contextArticleId) {
    const contextArticle = loadArticleById(contextArticleId);
    if (!contextArticle) return [];

    const extras = keywords.length
      ? (db
          .prepare(
            `SELECT a.article_id, a.title, a.summary, a.body_text, a.service_daytime,
                    a.main_category, a.image_url, a.like_count, a.comment_count,
                    c.middle_code_nm as category_name
             FROM articles a
             LEFT JOIN categories c ON a.main_category = c.small_code_id
             WHERE a.article_id != ?
               AND (${keywords.map(() => "(a.title LIKE ? OR a.body_text LIKE ?)").join(" OR ")})
             ORDER BY a.service_daytime DESC
             LIMIT 8`
          )
          .all(
            contextArticleId,
            ...keywords.flatMap((keyword) => [`%${keyword}%`, `%${keyword}%`])
          ) as ArticleCandidate[])
      : [];

    return [contextArticle, ...extras];
  }

  if (!keywords.length) {
    return loadRecentArticles(20);
  }

  return db
    .prepare(
      `SELECT a.article_id, a.title, a.summary, a.body_text, a.service_daytime,
              a.main_category, a.image_url, a.like_count, a.comment_count,
              c.middle_code_nm as category_name
       FROM articles a
       LEFT JOIN categories c ON a.main_category = c.small_code_id
       WHERE ${keywords.map(() => "(a.title LIKE ? OR a.body_text LIKE ?)").join(" OR ")}
       ORDER BY a.service_daytime DESC
       LIMIT 20`
    )
    .all(...keywords.flatMap((keyword) => [`%${keyword}%`, `%${keyword}%`])) as ArticleCandidate[];
}

function scoreArticle(article: ArticleCandidate, profile: UserProfile): ScoredArticle {
  const profession = getProfessionConfig(profile.occupation);
  const category = getCategory(article);
  const text = normalizeText(`${article.title} ${article.summary ?? ""} ${article.body_text}`);
  const professionMatches = matchedKeywords(text, profession.keywords);
  const interestKeywords = profile.interests.flatMap((interest) => CATEGORY_KEYWORDS[interest] ?? []);
  const interestMatches = matchedKeywords(text, interestKeywords);

  let relevanceScore = 10;
  let importanceScore = 10;

  if (profile.interests.includes(category as never)) {
    relevanceScore += 15;
  }
  if (professionMatches.length > 0) {
    relevanceScore += 25;
  }
  if (interestMatches.length > 0) {
    relevanceScore += 10;
  }

  if (containsAny(text, POLICY_KEYWORDS)) {
    importanceScore += 30;
  }
  if (containsAny(text, URGENT_KEYWORDS)) {
    importanceScore += 15;
  }
  if (article.comment_count > 50 || article.like_count > 10) {
    importanceScore += 10;
  }
  if (category === "스타투데이" || category === "문화") {
    importanceScore -= 20;
  }

  const matched = [...new Set([...professionMatches, ...interestMatches])].slice(0, 6);
  const combinedScore = clampScore(relevanceScore * 0.55 + importanceScore * 0.45);

  return {
    articleId: article.article_id,
    title: article.title,
    category,
    oneSentenceSummary: summarizeArticle(article),
    whyItMatters: fallbackWhyItMatters(article, profile),
    recommendedAction: fallbackRecommendedAction(article),
    appDeepLink: `/article/${article.article_id}`,
    spokenScript: "",
    relevanceScore: clampScore(relevanceScore),
    importanceScore: clampScore(importanceScore),
    combinedScore,
    matchedKeywords: matched,
    imageUrl: article.image_url,
  };
}

function resolveProfile(profileId: number, profileOverride?: UserProfile): UserProfile {
  return {
    ...DEMO_PROFILE,
    userId: profileId,
    ...(profileOverride ?? {}),
    interests: profileOverride?.interests ?? DEMO_PROFILE.interests,
  };
}

function rankAskCandidates(
  question: string,
  profileId: number,
  profile: UserProfile,
  contextArticleId?: number
): ArticleCandidate[] {
  if (!contextArticleId && isGenericPriorityQuestion(question)) {
    return buildConciergeScore(profileId, profile)
      .briefing
      .map((item) => loadArticleById(item.articleId))
      .filter(Boolean) as ArticleCandidate[];
  }

  const keywords = buildQuestionKeywords(question);
  const candidates = searchArticles(question, contextArticleId);

  if (!candidates.length) {
    return [];
  }

  if (!keywords.length && !contextArticleId) {
    return buildConciergeScore(profileId, profile)
      .briefing
      .map((item) => loadArticleById(item.articleId))
      .filter(Boolean) as ArticleCandidate[];
  }

  return candidates
    .map((article) => {
      const scored = scoreArticle(article, profile);
      const text = normalizeText(`${article.title} ${article.summary ?? ""} ${article.body_text}`);
      const questionMatchCount = matchedKeywords(text, keywords).length;
      const entertainmentPenalty = ["스타투데이", "문화", "방송·TV", "핫이슈"].includes(getCategory(article))
        ? 25
        : 0;
      const askScore =
        scored.combinedScore + questionMatchCount * 12 + (contextArticleId ? 100 : 0) - entertainmentPenalty;

      return {
        article,
        askScore,
      };
    })
    .sort((a, b) => b.askScore - a.askScore)
    .map((entry) => entry.article)
    .slice(0, 5);
}

function recordHandoff(profileId: number, articleId: number, title: string, source: ConciergeSource) {
  const db = getDb();
  db.prepare(
    `INSERT INTO concierge_handoffs (profile_id, article_id, title, source)
     VALUES (?, ?, ?, ?)`
  ).run(profileId, articleId, title, source);
}

function mapActionRow(row: {
  id: number;
  profile_id: number;
  article_id: number;
  title: string;
  action_type: "save" | "remind";
  note: string | null;
  remind_at: string | null;
  status: "pending" | "completed";
  created_at: string;
}): ConciergeActionItem {
  return {
    id: row.id,
    profileId: row.profile_id,
    articleId: row.article_id,
    title: row.title,
    actionType: row.action_type,
    note: row.note,
    remindAt: row.remind_at,
    status: row.status,
    createdAt: row.created_at,
  };
}

function resolvePresetTime(preset: ActionPreset): string {
  const now = new Date();

  if (preset === "lunch") {
    now.setHours(12, 30, 0, 0);
  } else if (preset === "before_leave") {
    now.setHours(18, 0, 0, 0);
  } else {
    now.setDate(now.getDate() + 1);
    now.setHours(8, 30, 0, 0);
  }

  return now.toISOString();
}

export function buildConciergeScore(profileId: number, profileOverride?: UserProfile) {
  const profile = resolveProfile(profileId, profileOverride);
  const scored = loadRecentArticles().map((article) => scoreArticle(article, profile));
  const sorted = scored.sort((a, b) => b.combinedScore - a.combinedScore);

  return {
    briefing: sorted.filter((item) => item.combinedScore >= 50).slice(0, 3),
    breakingAlerts: sorted.filter(
      (item) =>
        item.combinedScore >= 80 &&
        containsAny(item.title, POLICY_KEYWORDS)
    ),
    ignored: sorted.filter((item) => item.combinedScore < 50).length,
  };
}

export function buildMorningBrief(profileId: number, profileOverride?: UserProfile): BriefResponse {
  const profile = resolveProfile(profileId, profileOverride);
  const items = buildConciergeScore(profileId, profileOverride).briefing.map((item) => ({
    ...item,
    spokenScript: buildSpokenItem(item),
  }));
  const { greeting, script } = buildRobotScript(items, profile);

  if (items[0]) {
    recordHandoff(profileId, items[0].articleId, items[0].title, "brief");
  }

  return {
    greeting,
    items,
    totalSpokenDuration: estimateSpokenDuration(script),
    robotScript: script,
  };
}

export function buildAskMyNews(
  profileId: number,
  question: string,
  style: "short" | "easy" | "compare" = "short",
  contextArticleId?: number,
  profileOverride?: UserProfile
): AskResponse {
  const profile = resolveProfile(profileId, profileOverride);
  const profession = getProfessionConfig(profile.occupation);
  const articles = rankAskCandidates(question, profileId, profile, contextArticleId);
  const primary = articles[0];

  if (!primary) {
    return {
      answer: "관련 뉴스를 찾지 못했습니다. 다른 표현으로 다시 질문해보세요.",
      spokenAnswer: "관련 뉴스를 바로 찾지 못했습니다. 조금 다른 표현으로 다시 물어봐 주세요.",
      sources: [],
      articles: [],
      followUpQuestions: ["오늘 중요한 뉴스만 알려줘", "경제 뉴스 핵심만 정리해줘"],
    };
  }

  const summary = summarizeArticle(primary);
  const whyItMatters = fallbackWhyItMatters(primary, profile);
  const recommendedAction = fallbackRecommendedAction(primary);

  let answer = `${primary.title} 기사 기준으로 보면, ${summary} ${whyItMatters} ${recommendedAction}`;
  let spokenAnswer = answer;

  if (style === "easy") {
    answer = `${primary.title} 뉴스는 쉽게 말해, ${summary} ${profession.honorific}의 ${profession.focusAreas[0]}에 바로 영향을 줄 수 있다는 뜻입니다. 우선 ${recommendedAction}`;
    spokenAnswer = answer;
  } else if (style === "compare") {
    answer = `${primary.title} 기준으로 보면, 이번 변화의 핵심은 ${summary} 입니다. 이전과의 비교 포인트는 적용 시점과 대상 범위를 먼저 확인하는 것입니다. ${recommendedAction}`;
    spokenAnswer = answer;
  }

  if (spokenAnswer.length > 200) {
    spokenAnswer = spokenAnswer.slice(0, 197) + "...";
  }

  recordHandoff(profileId, primary.article_id, primary.title, "ask");

  return {
    answer,
    spokenAnswer,
    primaryArticleId: primary.article_id,
    sources: articles.map((article) => ({
      articleId: article.article_id,
      title: article.title,
    })),
    articles: articles.map((article) => ({
      article_id: article.article_id,
      title: article.title,
      category_name: getCategory(article),
      service_daytime: article.service_daytime,
      image_url: article.image_url,
    })),
    followUpQuestions: [
      "왜 나한테 중요한데?",
      "쉽게 다시 설명해줘",
      "퇴근 전에 다시 알려줘",
    ],
  };
}

export function buildBreakingAlert(
  profileId: number,
  articleId?: number,
  since?: string,
  profileOverride?: UserProfile
): AlertResponse {
  const profile = resolveProfile(profileId, profileOverride);
  const candidates = articleId
    ? [loadArticleById(articleId)].filter(Boolean) as ArticleCandidate[]
    : loadRecentArticles(20, since);

  const scored = candidates
    .map((article) => scoreArticle(article, profile))
    .sort((a, b) => b.combinedScore - a.combinedScore);
  const top = scored[0];

  if (!top || top.combinedScore < 80 || !containsAny(top.title, POLICY_KEYWORDS)) {
    return {
      shouldAlert: false,
      urgency: "medium",
      spokenAlert: "",
      shortExplanation: "",
      checkedUntil: new Date().toISOString(),
    };
  }

  recordHandoff(profileId, top.articleId, top.title, "alert");

  return {
    shouldAlert: true,
    articleId: top.articleId,
    urgency: top.combinedScore >= 90 ? "high" : "medium",
    spokenAlert: `방금 ${top.title} 관련 속보가 나왔습니다. ${top.whyItMatters} 15초로 요약해드릴까요?`,
    shortExplanation: `${top.oneSentenceSummary} ${top.whyItMatters}`,
    appDeepLink: top.appDeepLink,
    checkedUntil: new Date().toISOString(),
  };
}

export function createSavedAction(
  profileId: number,
  articleId: number,
  note?: string | null
): ConciergeActionItem {
  const db = getDb();
  const article = loadArticleById(articleId);

  if (!article) {
    throw new Error("Article not found");
  }

  const result = db
    .prepare(
      `INSERT INTO concierge_actions (profile_id, article_id, title, action_type, note)
       VALUES (?, ?, ?, 'save', ?)`
    )
    .run(profileId, articleId, article.title, note ?? null);

  recordHandoff(profileId, articleId, article.title, "ask");

  const row = db
    .prepare("SELECT * FROM concierge_actions WHERE id = ?")
    .get(result.lastInsertRowid) as {
    id: number;
    profile_id: number;
    article_id: number;
    title: string;
    action_type: "save" | "remind";
    note: string | null;
    remind_at: string | null;
    status: "pending" | "completed";
    created_at: string;
  };

  return mapActionRow(row);
}

export function createReminderAction(
  profileId: number,
  articleId: number,
  preset?: ActionPreset,
  remindAt?: string | null
): ConciergeActionItem {
  const db = getDb();
  const article = loadArticleById(articleId);

  if (!article) {
    throw new Error("Article not found");
  }

  const finalRemindAt = remindAt ?? (preset ? resolvePresetTime(preset) : resolvePresetTime("before_leave"));
  const result = db
    .prepare(
      `INSERT INTO concierge_actions (profile_id, article_id, title, action_type, remind_at)
       VALUES (?, ?, ?, 'remind', ?)`
    )
    .run(profileId, articleId, article.title, finalRemindAt);

  recordHandoff(profileId, articleId, article.title, "ask");

  const row = db
    .prepare("SELECT * FROM concierge_actions WHERE id = ?")
    .get(result.lastInsertRowid) as {
    id: number;
    profile_id: number;
    article_id: number;
    title: string;
    action_type: "save" | "remind";
    note: string | null;
    remind_at: string | null;
    status: "pending" | "completed";
    created_at: string;
  };

  return mapActionRow(row);
}

export function getTodayActions(profileId: number): ConciergeActionItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT *
       FROM concierge_actions
       WHERE profile_id = ? AND status = 'pending'
       ORDER BY CASE WHEN remind_at IS NULL THEN 1 ELSE 0 END, remind_at ASC, created_at DESC`
    )
    .all(profileId) as Array<{
    id: number;
    profile_id: number;
    article_id: number;
    title: string;
    action_type: "save" | "remind";
    note: string | null;
    remind_at: string | null;
    status: "pending" | "completed";
    created_at: string;
  }>;

  return rows.map(mapActionRow);
}

export function completeAction(actionId: number) {
  const db = getDb();
  db.prepare(
    `UPDATE concierge_actions
     SET status = 'completed', completed_at = datetime('now')
     WHERE id = ?`
  ).run(actionId);
}

export function getLatestHandoff(profileId: number): ConciergeHandoff | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT article_id, title, source, created_at
       FROM concierge_handoffs
       WHERE profile_id = ?
       ORDER BY id DESC
       LIMIT 1`
    )
    .get(profileId) as
    | {
        article_id: number;
        title: string;
        source: ConciergeSource;
        created_at: string;
      }
    | undefined;

  if (!row) return null;

  return {
    articleId: row.article_id,
    title: row.title,
    source: row.source,
    timestamp: row.created_at,
    appDeepLink: `/article/${row.article_id}`,
  };
}
