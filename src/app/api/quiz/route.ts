import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/quiz - 오늘의 뉴스 퀴즈 생성 */
export async function GET() {
  try {
    initDb();
    const db = getDb();

    // 최근 인기 기사 5개 선택
    const articles = db
      .prepare(
        `SELECT a.article_id, a.title, a.summary, a.body_text,
                c.middle_code_nm as category_name
         FROM articles a
         LEFT JOIN categories c ON a.main_category = c.small_code_id
         WHERE a.summary IS NOT NULL AND length(a.summary) > 50
         ORDER BY a.service_daytime DESC
         LIMIT 5`
      )
      .all() as {
        article_id: number;
        title: string;
        summary: string;
        body_text: string;
        category_name: string;
      }[];

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });
    const articleContext = articles
      .map((a, i) => `[기사 ${i + 1}] ${a.title}\n${a.body_text.slice(0, 200)}`)
      .join("\n\n");

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `다음 뉴스 기사들을 바탕으로 뉴스 퀴즈 3문제를 만들어주세요.

${articleContext}

반드시 아래 JSON 배열 형식으로만 응답해주세요:
[
  {
    "question": "질문 내용",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
    "answer": 0,
    "explanation": "정답 해설",
    "articleIndex": 0
  }
]

answer는 정답 선택지의 인덱스(0부터), articleIndex는 참고한 기사 번호(0부터)입니다.`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    let quizzes;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      quizzes = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      quizzes = [];
    }

    // 기사 정보 연결
    const enrichedQuizzes = quizzes.map((q: { articleIndex?: number; question: string; options: string[]; answer: number; explanation: string }) => ({
      ...q,
      relatedArticle: articles[q.articleIndex || 0]
        ? {
            articleId: articles[q.articleIndex || 0].article_id,
            title: articles[q.articleIndex || 0].title,
            category: articles[q.articleIndex || 0].category_name,
          }
        : null,
    }));

    return NextResponse.json({ quizzes: enrichedQuizzes });
  } catch (error) {
    console.error("Quiz error:", error);
    return NextResponse.json({ error: "퀴즈 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
