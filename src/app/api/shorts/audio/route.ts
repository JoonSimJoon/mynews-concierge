import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/shorts/audio?id=1 - 숏츠 TTS 오디오 스트리밍 */
export async function GET(request: NextRequest) {
  initDb();
  const db = getDb();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const row = db
    .prepare("SELECT tts_audio FROM shorts WHERE id = ?")
    .get(parseInt(id)) as { tts_audio: Buffer } | undefined;

  if (!row || !row.tts_audio) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(row.tts_audio), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": row.tts_audio.length.toString(),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
