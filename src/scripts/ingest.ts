/**
 * 뉴스 데이터 인제스트 스크립트
 * data/2025/**\/*.json → SQLite articles 테이블
 *
 * 실행: npx tsx src/scripts/ingest.ts [--month 01] [--limit 1000]
 */

import fs from "fs";
import path from "path";
import { getDb, initDb, stripHtml } from "../lib/db";

const DATA_ROOT = path.resolve(process.cwd(), "../../data/2025");
const CATEGORY_FILE = path.resolve(process.cwd(), "../../data/03.매경 뉴스 카테고리.json");

interface RawArticle {
  article: {
    article_id: number;
    title: string;
    sub_title?: string;
    writers?: string;
    reg_dt?: string;
    service_daytime: string;
    pub_div: string;
    main_category: string;
  };
  article_body: { body: string };
  article_summary?: { summary?: string };
  article_url?: string;
  images?: { image_url?: string; image_caption?: string }[];
  share?: { like_count?: number; reply_count?: number };
  comments?: unknown[];
  categories?: {
    large_code_id: string;
    large_code_nm: string;
    middle_code_id: string;
    middle_code_nm: string;
    small_code_id: string;
    small_code_nm: string;
  }[];
}

function loadCategories(): void {
  const db = getDb();
  if (!fs.existsSync(CATEGORY_FILE)) {
    console.warn("카테고리 파일 없음:", CATEGORY_FILE);
    return;
  }
  const raw = JSON.parse(fs.readFileSync(CATEGORY_FILE, "utf-8"));
  const items = raw._DATA || raw;

  const existing = db.prepare("SELECT COUNT(*) as cnt FROM categories").get() as { cnt: number };
  if (existing.cnt > 0) {
    console.log(`카테고리 이미 로드됨 (${existing.cnt}건)`);
    return;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO categories (large_code_id, large_code_nm, middle_code_id, middle_code_nm, small_code_id, small_code_nm, seq)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const item of items) {
      insert.run(
        item.LARGE_CODE_ID || "",
        item.LARGE_CODE_NM || "",
        item.MIDDLE_CODE_ID || "",
        item.MIDDLE_CODE_NM || "",
        item.SMALL_CODE_ID || "",
        item.SMALL_CODE_NM || "",
        item.SEQ || 0
      );
    }
  });
  tx();
  console.log(`카테고리 ${items.length}건 로드 완료`);
}

function ingestMonth(month: string, limit?: number): number {
  const db = getDb();
  const monthDir = path.join(DATA_ROOT, month);

  if (!fs.existsSync(monthDir)) {
    console.warn(`디렉토리 없음: ${monthDir}`);
    return 0;
  }

  const files = fs.readdirSync(monthDir).filter((f) => f.endsWith(".json"));
  const total = limit ? Math.min(files.length, limit) : files.length;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO articles
    (article_id, title, sub_title, body_html, body_text, summary, writers,
     reg_dt, service_daytime, pub_div, main_category, article_url,
     image_url, image_caption, like_count, reply_count, comment_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  const batchSize = 500;

  for (let i = 0; i < total; i += batchSize) {
    const batch = files.slice(i, Math.min(i + batchSize, total));
    const tx = db.transaction(() => {
      for (const file of batch) {
        try {
          const raw: RawArticle = JSON.parse(
            fs.readFileSync(path.join(monthDir, file), "utf-8")
          );
          const a = raw.article;
          const bodyHtml = raw.article_body?.body || "";
          const bodyText = stripHtml(bodyHtml);

          if (!a?.article_id || !a?.title || !bodyText) continue;

          const firstImage = raw.images?.[0];

          insert.run(
            a.article_id,
            a.title,
            a.sub_title || null,
            bodyHtml,
            bodyText,
            raw.article_summary?.summary || null,
            a.writers || null,
            a.reg_dt || null,
            a.service_daytime,
            a.pub_div || "W",
            a.main_category || "",
            raw.article_url || null,
            firstImage?.image_url || null,
            firstImage?.image_caption || null,
            raw.share?.like_count || 0,
            raw.share?.reply_count || 0,
            raw.comments?.length || 0
          );
          count++;
        } catch {
          // skip malformed files
        }
      }
    });
    tx();

    if ((i + batchSize) % 2000 === 0 || i + batchSize >= total) {
      process.stdout.write(`\r  ${month}월: ${Math.min(i + batchSize, total)}/${total} 처리`);
    }
  }

  return count;
}

function main(): void {
  const args = process.argv.slice(2);
  const monthIdx = args.indexOf("--month");
  const limitIdx = args.indexOf("--limit");
  const targetMonth = monthIdx !== -1 ? args[monthIdx + 1] : null;
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : undefined;

  console.log("=== MyNews 데이터 인제스트 ===");
  console.log(`데이터 경로: ${DATA_ROOT}`);
  if (targetMonth) console.log(`대상 월: ${targetMonth}`);
  if (limit) console.log(`제한: ${limit}건/월`);

  initDb();
  loadCategories();

  const months = targetMonth
    ? [targetMonth]
    : ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

  let totalCount = 0;
  const stats: Record<string, number> = {};

  for (const month of months) {
    const count = ingestMonth(month, limit);
    stats[month] = count;
    totalCount += count;
    console.log(`\n  ${month}월: ${count}건 적재`);
  }

  console.log("\n=== 월별 통계 ===");
  for (const [month, count] of Object.entries(stats)) {
    const bar = "█".repeat(Math.round(count / 500));
    console.log(`  ${month}월: ${count.toLocaleString().padStart(7)}건 ${bar}`);
  }
  console.log(`\n  총계: ${totalCount.toLocaleString()}건 적재 완료`);

  // DB 통계
  const db = getDb();
  const catCount = (db.prepare("SELECT COUNT(*) as cnt FROM categories").get() as { cnt: number }).cnt;
  const artCount = (db.prepare("SELECT COUNT(*) as cnt FROM articles").get() as { cnt: number }).cnt;
  console.log(`\n  DB 현황: 카테고리 ${catCount}건, 기사 ${artCount}건`);
}

main();
