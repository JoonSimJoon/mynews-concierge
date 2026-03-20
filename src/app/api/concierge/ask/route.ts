import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { buildAskMyNews } from "@/services/concierge";
import type { UserProfile } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    initDb();
    const {
      profileId = 1,
      profile,
      question,
      style = "short",
      contextArticleId,
    } = (await request.json()) as {
      profileId?: number;
      profile?: UserProfile;
      question: string;
      style?: "short" | "easy" | "compare";
      contextArticleId?: number;
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    return NextResponse.json(
      buildAskMyNews(profileId, question.trim(), style, contextArticleId, profile)
    );
  } catch (error) {
    console.error("Concierge ask error:", error);
    return NextResponse.json({ error: "Failed to answer concierge question" }, { status: 500 });
  }
}
