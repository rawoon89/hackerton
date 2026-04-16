import { loadCSV, type CSVRow } from "../lib/csv-loader";

function header(s: string) {
  console.log("\n" + "=".repeat(64));
  console.log(s);
  console.log("=".repeat(64));
}

function fmtWon(won: number): string {
  if (won >= 100_000_000) return `약 ${(won / 100_000_000).toFixed(2)}억원`;
  if (won >= 10_000) return `약 ${Math.round(won / 10_000)}만원`;
  return `${won}원`;
}

function topN(
  counts: Record<string, number>,
  n: number,
): Array<[string, number]> {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

async function q1(profiles: CSVRow[], headers: CSVRow[]) {
  header("Q1. 30대 남성 고객이 가장 많이 가입한 상품 카테고리는?");

  const targets = profiles.filter((p) => {
    const age = parseInt(p.age, 10);
    return !isNaN(age) && age >= 30 && age < 40 && p.gender === "남성";
  });
  const targetIds = new Set(targets.map((p) => p.customer_id));

  const categoryCounts: Record<string, number> = {};
  for (const h of headers) {
    if (!targetIds.has(h.customer_id)) continue;
    categoryCounts[h.category] = (categoryCounts[h.category] ?? 0) + 1;
  }

  console.log(`대상 고객 수: ${targets.length}명`);
  console.log(`해당 고객의 총 계약 수: ${Object.values(categoryCounts).reduce((a, b) => a + b, 0)}건`);
  console.log("카테고리별 계약 수 (내림차순):");
  for (const [cat, cnt] of topN(categoryCounts, 10)) {
    console.log(`  ${cat}: ${cnt}건`);
  }
  const top = topN(categoryCounts, 1)[0];
  console.log(`\n→ 정답: ${top[0]} (${top[1]}건)`);
}

async function q2(rows: CSVRow[]) {
  header("Q2. 최근 12개월 손해율이 가장 악화된 보험사는? (경과보험료 가중평균)");

  const months = Array.from(new Set(rows.map((r) => r["연월"]))).sort();
  const recent12 = new Set(months.slice(-12));
  const prev12 = new Set(months.slice(-24, -12));
  console.log(`전체 개월: ${months[0]} ~ ${months[months.length - 1]} (${months.length}개월)`);
  console.log(`recent_12: ${Array.from(recent12).sort()[0]} ~ ${Array.from(recent12).sort().slice(-1)[0]}`);
  console.log(`prev_12:   ${Array.from(prev12).sort()[0]} ~ ${Array.from(prev12).sort().slice(-1)[0]}`);
  console.log(`방법: 실제 손해율 = Σ(청구금액_원) / Σ(경과보험료_원) × 100`);

  const buckets: Record<
    string,
    {
      recent: { p: number; c: number };
      prev: { p: number; c: number };
    }
  > = {};
  for (const r of rows) {
    const ins = r["보험사"];
    if (!ins) continue;
    const p = parseFloat(r["경과보험료_원"]);
    const c = parseFloat(r["청구금액_원"]);
    if (isNaN(p) || isNaN(c)) continue;
    (buckets[ins] ||= {
      recent: { p: 0, c: 0 },
      prev: { p: 0, c: 0 },
    });
    const m = r["연월"];
    if (recent12.has(m)) {
      buckets[ins].recent.p += p;
      buckets[ins].recent.c += c;
    } else if (prev12.has(m)) {
      buckets[ins].prev.p += p;
      buckets[ins].prev.c += c;
    }
  }

  const ratio = (b: { p: number; c: number }) =>
    b.p > 0 ? (b.c / b.p) * 100 : 0;

  const stats = Object.entries(buckets)
    .map(([ins, b]) => {
      const r = ratio(b.recent);
      const p = ratio(b.prev);
      return {
        insurer: ins,
        recent: +r.toFixed(2),
        prev: +p.toFixed(2),
        delta: +(r - p).toFixed(3),
      };
    })
    .sort((a, b) => b.delta - a.delta);

  console.log("보험사별 delta (recent − prev, 악화 순):");
  for (const s of stats) {
    console.log(
      `  ${s.insurer.padEnd(8)} prev=${String(s.prev).padStart(6)}%  recent=${String(s.recent).padStart(6)}%  Δ=${s.delta >= 0 ? "+" : ""}${s.delta}pp`,
    );
  }
  console.log(
    `\n→ 정답: ${stats[0].insurer} (Δ=${stats[0].delta >= 0 ? "+" : ""}${stats[0].delta}pp, ${stats[0].prev}% → ${stats[0].recent}%)`,
  );
}

async function q3(risk: CSVRow[]) {
  header("Q3. 적극형 고객의 평균 월 투자 가용금액은?");

  const labels: Record<string, number[]> = {};
  for (const r of risk) {
    const v = parseFloat(r.monthly_invest_capacity_won);
    if (isNaN(v)) continue;
    (labels[r.risk_label] ||= []).push(v);
  }

  console.log("risk_label별 통계:");
  for (const [label, arr] of Object.entries(labels)) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    console.log(
      `  ${label.padEnd(6)} n=${String(arr.length).padStart(3)}  avg=${Math.round(mean).toLocaleString()}원  (${fmtWon(mean)})  min=${Math.min(...arr).toLocaleString()}  max=${Math.max(...arr).toLocaleString()}`,
    );
  }

  const target = labels["적극형"];
  if (!target) {
    console.log("\n→ '적극형' 라벨 없음");
    return;
  }
  const mean = target.reduce((a, b) => a + b, 0) / target.length;
  console.log(
    `\n→ 정답: ${Math.round(mean).toLocaleString()}원 (${fmtWon(mean)}) — n=${target.length}`,
  );
}

async function q4(profiles: CSVRow[], headers: CSVRow[], coverages: CSVRow[]) {
  header("Q4. 자녀 둘 이상 가구가 관심 있는 보장은?");

  const targets = profiles.filter((p) => {
    const c = parseInt(p.child_count, 10);
    return !isNaN(c) && c >= 2;
  });
  const targetIds = new Set(targets.map((p) => p.customer_id));
  console.log(`대상 고객 수 (자녀 2명 이상): ${targets.length}명`);

  const policyIds = new Set(
    headers.filter((h) => targetIds.has(h.customer_id)).map((h) => h.policy_id),
  );
  console.log(`해당 고객의 계약 수: ${policyIds.size}건`);

  const coverageGroupCounts: Record<string, number> = {};
  const coverageNameCounts: Record<string, number> = {};
  for (const c of coverages) {
    if (!policyIds.has(c.policy_id)) continue;
    coverageGroupCounts[c.coverage_group] =
      (coverageGroupCounts[c.coverage_group] ?? 0) + 1;
    coverageNameCounts[c.coverage_name] =
      (coverageNameCounts[c.coverage_name] ?? 0) + 1;
  }

  console.log("\n보장 그룹(coverage_group) 상위 10:");
  for (const [k, v] of topN(coverageGroupCounts, 10)) {
    console.log(`  ${k}: ${v}건`);
  }

  console.log("\n보장명(coverage_name) 상위 10:");
  for (const [k, v] of topN(coverageNameCounts, 10)) {
    console.log(`  ${k}: ${v}건`);
  }

  // Also look at stated priority needs from profile itself
  const priorityNeeds: Record<string, number> = {};
  for (const p of targets) {
    for (const f of ["priority_need_1", "priority_need_2"]) {
      const v = p[f];
      if (v) priorityNeeds[v] = (priorityNeeds[v] ?? 0) + 1;
    }
  }
  console.log("\n참고 - 고객 프로필의 priority_need 상위 10:");
  for (const [k, v] of topN(priorityNeeds, 10)) {
    console.log(`  ${k}: ${v}명`);
  }

  const top = topN(coverageGroupCounts, 1)[0];
  console.log(
    `\n→ 정답 (coverage_group 기준): ${top[0]} (${top[1]}건)`,
  );
}

async function q5() {
  header("Q5. 내일 주가가 오를까?");
  console.log("미래 예측 요청 → 거절 케이스 (ground truth 없음)");
  console.log("기대 동작: router.rejected=true, reject_reason='미래 예측 요청' 등");
}

async function main() {
  const [profiles, headers, coverages, loss, risk] = await Promise.all([
    loadCSV("customer_profiles.csv"),
    loadCSV("policy_headers.csv"),
    loadCSV("policy_coverages.csv"),
    loadCSV("loss_ratio_timeseries.csv"),
    loadCSV("risk_profiles.csv"),
  ]);

  console.log("[loaded]");
  console.log(
    `  profiles=${profiles.length}, headers=${headers.length}, coverages=${coverages.length}, loss=${loss.length}, risk=${risk.length}`,
  );

  await q1(profiles, headers);
  await q2(loss);
  await q3(risk);
  await q4(profiles, headers, coverages);
  await q5();
}

main().catch((err) => {
  console.error("ground-truth 계산 실패:", err);
  process.exit(1);
});
