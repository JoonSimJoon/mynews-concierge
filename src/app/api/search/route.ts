import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import type { UserProfile } from "@/types";

export const dynamic = "force-dynamic";

/** POST /api/search { query, profile } - AI 대화형 검색 */
export async function POST(request: NextRequest) {
  try {
    initDb();
    const db = getDb();
    const { query, profile } = (await request.json()) as {
      query: string;
      profile?: UserProfile;
    };

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });
    }

    // 키워드 추출 (띄어쓰기 기준)
    const keywords = query.trim().split(/\s+/).filter(Boolean);

    // FTS 대신 LIKE 기반 검색 (해커톤용 간이)
    const conditions = keywords.map(() => "a.title LIKE ?").join(" OR ");
    const params = keywords.map((kw) => `%${kw}%`);

    const articles = db
      .prepare(
        `SELECT a.article_id, a.title, a.summary, a.body_text, a.service_daytime,
                a.image_url, a.like_count, a.comment_count,
                c.middle_code_nm as category_name
         FROM articles a
         LEFT JOIN categories c ON a.main_category = c.small_code_id
         WHERE ${conditions}
         ORDER BY a.service_daytime DESC
         LIMIT 10`
      )
      .all(...params) as {
        article_id: number;
        title: string;
        summary: string;
        body_text: string;
        service_daytime: string;
        image_url: string;
        like_count: number;
        comment_count: number;
        category_name: string;
      }[];

    // Claude API로 AI 답변 생성 (API 키 있을 때만)
    let aiAnswer = "";
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey && articles.length > 0) {
        const client = new Anthropic({ apiKey });
        const context = articles
          .slice(0, 5)
          .map((a, i) => `[${i + 1}] ${a.title}\n${a.body_text?.slice(0, 300)}`)
          .join("\n\n");

        const styleHint = profile?.writingStyle === "formal" ? "격식체로" :
                          profile?.writingStyle === "concise" ? "간결하게" :
                          profile?.writingStyle === "detailed" ? "상세하게" : "친근하게";

        const message = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: `다음 매일경제 뉴스 기사들을 참고하여 질문에 ${styleHint} 답변해주세요. 답변 끝에 참고한 기사 번호를 [출처: 1, 3] 형식으로 표시해주세요.

[질문] ${query}

[참고 기사]
${context}`,
            },
          ],
        });
        aiAnswer = message.content[0].type === "text" ? message.content[0].text : "";
      }
    } catch {
      // API 키 없거나 실패 시 기사 목록만 반환
    }

    return NextResponse.json({
      query,
      aiAnswer,
      articles: articles.map(({ body_text, ...rest }) => rest),
      totalResults: articles.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "검색 중 오류가 발생했습니다." }, { status: 500 });
  }
}
