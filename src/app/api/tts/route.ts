import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 한국어 Edge TTS 목소리 옵션 */
const VOICE_MAP: Record<string, string> = {
  female_calm: "ko-KR-SunHiNeural",     // 차분한 여성
  male_calm: "ko-KR-InJoonNeural",       // 차분한 남성
  female_bright: "ko-KR-JiMinNeural",    // 밝은 여성
  male_news: "ko-KR-BongJinNeural",      // 뉴스 남성
  female_friendly: "ko-KR-SeoHyeonNeural", // 친근한 여성
  male_friendly: "ko-KR-GookMinNeural",  // 친근한 남성
};

/** POST /api/tts { text, voice?, rate? } */
export async function POST(request: NextRequest) {
  try {
    const { text, voice, rate } = (await request.json()) as {
      text: string;
      voice?: string;
      rate?: string;
    };

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "텍스트가 필요합니다." }, { status: 400 });
    }

    // 최대 2000자 제한
    const truncated = text.slice(0, 2000);
    const selectedVoice = VOICE_MAP[voice || "female_calm"] || VOICE_MAP.female_calm;
    const selectedRate = rate || "+0%";

    const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
    const edgeTts = new MsEdgeTTS();
    await edgeTts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    // rate 변환: "+0%" → 1.0, "+25%" → 1.25 등
    const rateNum = selectedRate === "+0%" ? 1 : selectedRate === "-25%" ? 0.75 : selectedRate === "+25%" ? 1.25 : 1.5;
    const { audioStream } = edgeTts.toStream(truncated, { rate: rateNum });

    // 스트림을 버퍼로 수집
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      audioStream.on("end", () => resolve());
      audioStream.on("error", (err: Error) => reject(err));
    });
    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json({ error: "음성 생성에 실패했습니다." }, { status: 500 });
  }
}

/** GET /api/tts/voices - 사용 가능한 목소리 목록 */
export async function GET() {
  const voices = Object.entries(VOICE_MAP).map(([key, shortName]) => ({
    id: key,
    name: shortName,
    label: {
      female_calm: "차분한 여성 (선희)",
      male_calm: "차분한 남성 (인준)",
      female_bright: "밝은 여성 (지민)",
      male_news: "뉴스 남성 (봉진)",
      female_friendly: "친근한 여성 (서현)",
      male_friendly: "친근한 남성 (국민)",
    }[key],
  }));

  return NextResponse.json({ voices });
}
