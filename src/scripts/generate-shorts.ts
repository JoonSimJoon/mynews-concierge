/**
 * 숏츠 생성 스크립트
 * 최근 인기 기사 5개를 선정 → Claude로 숏폼 변환 → TTS 생성 → DB 저장
 *
 * 실행: ANTHROPIC_API_KEY=sk-... npx tsx src/scripts/generate-shorts.ts
 * 옵션: --dry-run  (프롬프트 결과만 확인, TTS/DB 저장 안함)
 *       --count N  (생성할 숏츠 수, 기본 5)
 */

import { getDb, initDb } from "../lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const FALLBACK_VOICE = "ko-KR-SunHiNeural";

const VOICES: { name: string; id: string }[] = [
  { name: "ko-KR-SunHiNeural", id: "female_calm" },
  { name: "ko-KR-InJoonNeural", id: "male_calm" },
];

/** TTS 생성 (실패 시 SunHiNeural 폴백) */
async function generateTtsAudio(text: string, voice: string): Promise<Buffer> {
  const tryVoice = async (v: string): Promise<Buffer> => {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(v, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      audioStream.on("end", () => {
        const buf = Buffer.concat(chunks);
        if (buf.length < 100) reject(new Error("Empty audio"));
        else resolve(buf);
      });
      audioStream.on("error", (err: Error) => reject(err));
    });
  };

  try {
    return await tryVoice(voice);
  } catch {
    if (voice !== FALLBACK_VOICE) {
      console.log(`    폴백: ${FALLBACK_VOICE}`);
      return await tryVoice(FALLBACK_VOICE);
    }
    throw new Error("TTS 생성 실패 (폴백 포함)");
  }
}

/** 숏폼 생성 프롬프트 (V4 - 최종) */
const SHORTS_PROMPT = `당신은 MZ세대를 위한 뉴스 숏폼 크리에이터입니다. 틱톡/릴스에서 수백만 조회수를 찍는 뉴스 채널 "MyNews"를 운영합니다.

## TTS 낭독 원칙
이 글은 음성으로 낭독됩니다. 귀로 들었을 때 자연스럽게 작성하세요.
- 괄호, 따옴표 최소화 (TTS가 어색하게 읽음)
- 짧은 문장 (한 문장 25자 이내)
- 약어보다 풀어쓰기 (ex. "기재부" → "기획재정부")

## 당신의 시그니처 스타일
- 친구한테 카톡으로 뉴스 알려주듯 자연스럽게
- 첫 문장에서 반드시 "어?" 하게 만들기
- 숫자를 생활 비유로 체감시키기 (100억 → "서울 아파트 10채 값")
- 마지막은 여운을 남기는 한마디

## 문체 통일
- 반드시 ~해요/~거든요/~인데요 체 (존칭 구어체)
- ~야/~지/~거든 (반말) 절대 금지
- ~입니다/~했다 (문어체) 절대 금지

## 금지 목록
- "핵심은요" "결국" "정리하면" "한마디로" 같은 클리셰
- "~라는 거예요" 반복 (전체에서 최대 1회)
- "안녕하세요" 류 인사
- 이모지

## 구조 (반드시 220~280자)
[후킹] 1~2문장. 질문/놀라운 사실/반전으로 시작.
[전개] 3~5문장. 왜/어떻게/얼마나. 구체적 숫자+생활 비유 필수.
[펀치라인] 1문장. 질문형 또는 통찰로 여운 남기기.

## 나쁜 예시
"한국은행이 기준금리를 0.25%포인트 인상했다. 이에 따라 대출 금리가 상승할 것으로 보인다."
→ 문어체, 후킹 없음, 비유 없음

## 좋은 예시
"대출 이자, 또 오른다고요? 한국은행이 기준금리를 올렸거든요. 0.25%포인트인데, 1억 대출 기준으로 월 이자가 2만원 넘게 늘어나요. 내 월급에서 치킨 한 마리가 매달 사라지는 셈이에요. 변동금리 대출 있으신 분들은 고정금리 전환을 진지하게 고민해보셔야 해요. 그런데 더 무서운 건, 이번이 마지막 인상이 아닐 수 있다는 거예요."
→ 240자, 질문 후킹, 치킨 비유, 여운 마무리

## 반드시 아래 JSON만 출력하세요. 다른 텍스트 없이 JSON만.
{"shortTitle":"궁금증 유발 제목 8~15자","shortBody":"숏폼 본문 220~280자","shortSummary":"한 줄 요약 15~25자","tone":"톤","perspective":"관점"}`;

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const countIdx = args.indexOf("--count");
  const count = countIdx !== -1 ? parseInt(args[countIdx + 1]) : 5;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY 환경변수를 설정해주세요.");
    process.exit(1);
  }

  console.log(`=== MyNews 숏츠 생성 ${dryRun ? "(DRY RUN)" : ""} ===`);
  console.log(`생성 수: ${count}개\n`);

  initDb();
  const db = getDb();
  const client = new Anthropic({ apiKey });

  // 이미 생성된 article_id
  const existing = db
    .prepare("SELECT article_id FROM shorts")
    .all()
    .map((r: unknown) => (r as { article_id: number }).article_id);

  // 기사 선정: 다양한 카테고리, 인기순
  const articles = db
    .prepare(
      `SELECT a.article_id, a.title, a.body_text, a.summary, a.image_url,
              a.service_daytime, a.like_count, a.comment_count,
              c.middle_code_nm as category_name
       FROM articles a
       LEFT JOIN categories c ON a.main_category = c.small_code_id
       WHERE length(a.body_text) > 300
         AND a.image_url IS NOT NULL
         AND c.middle_code_nm IS NOT NULL
         ${existing.length > 0 ? `AND a.article_id NOT IN (${existing.join(",")})` : ""}
       ORDER BY (a.like_count + a.comment_count * 2) DESC, a.service_daytime DESC
       LIMIT 30`
    )
    .all() as {
      article_id: number;
      title: string;
      body_text: string;
      summary: string;
      image_url: string;
      service_daytime: string;
      like_count: number;
      comment_count: number;
      category_name: string;
    }[];

  // 카테고리 다양성 보장
  const selected: typeof articles = [];
  const usedCategories = new Set<string>();
  for (const article of articles) {
    if (selected.length >= count) break;
    if (usedCategories.has(article.category_name)) continue;
    usedCategories.add(article.category_name);
    selected.push(article);
  }
  for (const article of articles) {
    if (selected.length >= count) break;
    if (selected.find((s) => s.article_id === article.article_id)) continue;
    selected.push(article);
  }

  console.log(`선정된 기사 ${selected.length}건:\n`);
  selected.forEach((a, i) => console.log(`  ${i + 1}. [${a.category_name}] ${a.title.slice(0, 50)}`));
  console.log();

  const insert = db.prepare(`
    INSERT OR REPLACE INTO shorts
    (article_id, original_title, short_title, short_body, short_summary,
     tone, perspective, category_name, image_url, tts_audio, tts_voice,
     profile_hash, service_daytime)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let successCount = 0;

  for (let i = 0; i < selected.length; i++) {
    const article = selected[i];
    const voice = VOICES[i % VOICES.length];

    console.log(`\n[${i + 1}/${selected.length}] ${article.title.slice(0, 45)}...`);

    // 1. Claude로 숏폼 변환
    console.log("  → AI 숏폼 변환 중...");
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: SHORTS_PROMPT,
      messages: [
        {
          role: "user",
          content: `다음 뉴스 기사를 숏폼으로 변환해주세요.

[카테고리] ${article.category_name}
[제목] ${article.title}
[본문]
${article.body_text.slice(0, 2000)}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      console.log("  ✗ JSON 파싱 실패");
      continue;
    }

    if (!parsed?.shortBody) {
      console.log("  ✗ 결과 없음");
      continue;
    }

    // 퀄리티 체크
    const bodyLen = parsed.shortBody.length;
    console.log(`  → 제목: "${parsed.shortTitle}" (${parsed.shortTitle.length}자)`);
    console.log(`  → 본문: ${bodyLen}자`);
    console.log(`  → 요약: "${parsed.shortSummary}"`);

    if (bodyLen < 100 || bodyLen > 500) {
      console.log(`  ⚠ 본문 길이 부적절 (${bodyLen}자), 스킵`);
      continue;
    }

    if (dryRun) {
      console.log(`  → [DRY RUN] 본문 미리보기:`);
      console.log(`    "${parsed.shortBody}"`);
      console.log(`  ✓ DRY RUN 완료`);
      successCount++;
      continue;
    }

    // 2. TTS 생성 (폴백 포함)
    console.log(`  → TTS 생성 중 (${voice.id})...`);
    let ttsAudio: Buffer;
    try {
      ttsAudio = await generateTtsAudio(parsed.shortBody, voice.name);
      console.log(`  → TTS: ${(ttsAudio.length / 1024).toFixed(1)}KB`);
    } catch (err) {
      console.log(`  ✗ TTS 실패: ${(err as Error).message}`);
      continue;
    }

    // 3. DB 저장
    insert.run(
      article.article_id,
      article.title,
      parsed.shortTitle,
      parsed.shortBody,
      parsed.shortSummary,
      parsed.tone || "",
      parsed.perspective || "",
      article.category_name,
      article.image_url,
      ttsAudio,
      voice.id,
      "default",
      article.service_daytime
    );

    console.log(`  ✓ 저장 완료`);
    successCount++;
  }

  const totalShorts = (db.prepare("SELECT COUNT(*) as cnt FROM shorts").get() as { cnt: number }).cnt;
  console.log(`\n=== 완료: ${successCount}/${selected.length} 성공, DB 총 ${totalShorts}개 숏츠 ===`);
}

main().catch(console.error);
