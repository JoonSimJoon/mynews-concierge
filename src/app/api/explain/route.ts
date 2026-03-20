import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import type { UserProfile } from "@/types";

export const dynamic = "force-dynamic";

/** POST /api/explain { articleId, profile } - AI 해설 */
export async function POST(request: NextRequest) {
  try {
    initDb();
    const db = getDb();
    const { articleId, profile } = (await request.json()) as {
      articleId: number;
      profile: UserProfile;
    };

    const article = db
      .prepare("SELECT title, body_text FROM articles WHERE article_id = ?")
      .get(articleId) as { title: string; body_text: string } | undefined;

    if (!article) {
      return NextResponse.json({ error: "기사를 찾을 수 없습니다." }, { status: 404 });
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    const knowledgeMap: Record<string, string> = {
      expert: "전문가 수준으로 심층 분석. 업계 맥락과 데이터 중심.",
      general: "일반인이 이해할 수 있게 핵심 배경과 영향을 설명.",
      beginner: "초보자도 이해할 수 있게 쉬운 비유와 예시를 활용해 설명.",
    };

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `다음 뉴스 기사에 대해 AI 해설을 작성해주세요. ${knowledgeMap[profile.knowledgeLevel] || knowledgeMap.general}

[기사 제목] ${article.title}
[기사 본문] ${article.body_text.slice(0, 1500)}

다음 형식으로 작성해주세요:
1. **배경**: 이 기사가 나오게 된 배경 (2-3문장)
2. **핵심 포인트**: 기사의 핵심 내용 3가지 (각 1문장)
3. **의미와 영향**: 이 뉴스가 가지는 의미와 앞으로의 영향 (2-3문장)
4. **알아두면 좋은 용어**: 기사에 나온 주요 용어 2-3개를 쉽게 풀이`,
        },
      ],
    });

    const explanation = message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ articleId, explanation });
  } catch (error) {
    console.error("Explain error:", error);
    return NextResponse.json({ error: "해설 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
