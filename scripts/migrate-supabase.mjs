/**
 * Supabase 데이터 이관 스크립트
 * 실행: node scripts/migrate-supabase.mjs
 *
 * 실행 전 아래 변수에 새 프로젝트 키를 채워넣으세요.
 */

import { createClient } from "@supabase/supabase-js";

// ── 구 프로젝트 (source) — 환경변수 또는 직접 입력 ──────────────
const OLD_URL = process.env.OLD_SUPABASE_URL ?? "https://xtacxcbqvolxrudihhjc.supabase.co";
const OLD_SERVICE_KEY = process.env.OLD_SUPABASE_SERVICE_KEY ?? "";

// ── 신 프로젝트 (target) — 환경변수 또는 직접 입력 ──────────────
const NEW_URL = process.env.NEW_SUPABASE_URL ?? "https://slgxvdtvgzddnonywyag.supabase.co";
const NEW_SERVICE_KEY = process.env.NEW_SUPABASE_SERVICE_KEY ?? "";

// ─────────────────────────────────────────────────────────────

const src = createClient(OLD_URL, OLD_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const dst = createClient(NEW_URL, NEW_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function migrateProjects() {
  console.log("▶ projects 이관 중...");
  const { data, error } = await src.from("projects").select("*");
  if (error) throw new Error(`projects 읽기 실패: ${error.message}`);

  if (!data.length) {
    console.log("  → projects 데이터 없음, 건너뜀");
    return;
  }

  const { error: insertErr } = await dst
    .from("projects")
    .upsert(data, { onConflict: "slug" });
  if (insertErr) throw new Error(`projects 쓰기 실패: ${insertErr.message}`);

  console.log(`  ✓ ${data.length}개 프로젝트 이관 완료`);
}

async function migrateReports() {
  console.log("▶ reports 이관 중...");

  // 전체 건수 먼저 확인
  const { count } = await src
    .from("reports")
    .select("*", { count: "exact", head: true });
  console.log(`  총 ${count}개 레코드`);

  const PAGE = 500;
  let offset = 0;
  let total = 0;

  while (true) {
    const { data, error } = await src
      .from("reports")
      .select("*")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) throw new Error(`reports 읽기 실패: ${error.message}`);
    if (!data.length) break;

    // id(bigserial)는 제외하고 insert — 새 DB에서 자동 채번
    const rows = data.map(({ id, ...rest }) => rest);

    const { error: insertErr } = await dst.from("reports").insert(rows);
    if (insertErr)
      throw new Error(`reports 쓰기 실패 (offset ${offset}): ${insertErr.message}`);

    total += data.length;
    console.log(`  → ${total} / ${count} 이관됨`);
    offset += PAGE;
  }

  console.log(`  ✓ reports 이관 완료 (총 ${total}개)`);
}

async function main() {
  if (!OLD_SERVICE_KEY || !NEW_SERVICE_KEY) {
    console.error("❌ OLD_SUPABASE_SERVICE_KEY / NEW_SUPABASE_SERVICE_KEY 환경변수를 설정하세요.");
    process.exit(1);
  }

  try {
    await migrateProjects();
    await migrateReports();
    console.log("\n✅ 이관 완료!");
    console.log("\n다음 단계:");
    console.log("  1. .env.local 의 SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY 교체");
    console.log("  2. Vercel 환경변수도 동일하게 교체 → 재배포");
  } catch (err) {
    console.error("❌ 오류:", err.message);
    process.exit(1);
  }
}

main();
