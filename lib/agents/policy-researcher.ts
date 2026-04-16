import { callGeminiJSON } from "../gemini";
import { loadCSV, type CSVRow } from "../csv-loader";
import type { ResearcherResponse } from "../types";
import { fallbackResponse, normalizeResearcherResponse } from "./utils";
import {
  ageBand,
  childBucket,
  countBy,
  topN,
  topNByMap,
} from "./aggregations";

const SOURCE_FILES = [
  "customer_profiles.csv",
  "policy_headers.csv",
  "policy_coverages.csv",
];
const RESEARCHER = "policy_researcher" as const;

function computeAggregations(
  profiles: CSVRow[],
  headers: CSVRow[],
  coverages: CSVRow[],
) {
  const profileById = new Map(profiles.map((p) => [p.customer_id, p]));
  const headersByPolicyId = new Map(headers.map((h) => [h.policy_id, h]));

  const demoBreakdown = countBy(
    profiles,
    (p) => `${ageBand(p.age)}_${p.gender}`,
  );

  const categoryByDemo: Record<string, Record<string, number>> = {};
  for (const h of headers) {
    const p = profileById.get(h.customer_id);
    if (!p) continue;
    const key = `${ageBand(p.age)}_${p.gender}`;
    (categoryByDemo[key] ||= {});
    categoryByDemo[key][h.category] =
      (categoryByDemo[key][h.category] ?? 0) + 1;
  }

  const coverageByChild: Record<string, Record<string, number>> = {};
  const categoryByChild: Record<string, Record<string, number>> = {};
  for (const c of coverages) {
    const h = headersByPolicyId.get(c.policy_id);
    if (!h) continue;
    const p = profileById.get(h.customer_id);
    if (!p) continue;
    const bucket = childBucket(p.child_count);
    (coverageByChild[bucket] ||= {});
    coverageByChild[bucket][c.coverage_group] =
      (coverageByChild[bucket][c.coverage_group] ?? 0) + 1;
  }
  for (const h of headers) {
    const p = profileById.get(h.customer_id);
    if (!p) continue;
    const bucket = childBucket(p.child_count);
    (categoryByChild[bucket] ||= {});
    categoryByChild[bucket][h.category] =
      (categoryByChild[bucket][h.category] ?? 0) + 1;
  }

  const needsByChild: Record<string, Record<string, number>> = {};
  for (const p of profiles) {
    const bucket = childBucket(p.child_count);
    (needsByChild[bucket] ||= {});
    for (const f of ["priority_need_1", "priority_need_2"]) {
      const v = p[f];
      if (v) needsByChild[bucket][v] = (needsByChild[bucket][v] ?? 0) + 1;
    }
  }

  return {
    total_customers: profiles.length,
    total_policies: headers.length,
    total_coverages: coverages.length,
    customer_demographic_breakdown: demoBreakdown,
    top_category_by_age_gender: topNByMap(categoryByDemo, 5),
    top_category_by_child_count: topNByMap(categoryByChild, 5),
    top_coverage_group_by_child_count: topNByMap(coverageByChild, 7),
    top_priority_needs_by_child_count: topNByMap(needsByChild, 7),
  };
}

function buildPrompt(
  question: string,
  hint: string,
  aggs: ReturnType<typeof computeAggregations>,
): string {
  return `당신은 보험 계약/고객 데이터 전문 리서처입니다.
JS에서 customer_profiles, policy_headers, policy_coverages를 customer_id/policy_id로 조인한 후 사전 집계한 결과입니다.

## 사전 집계
${JSON.stringify(aggs, null, 2)}

## 사용자 질문
${question}

## 분석 힌트
${hint}

## 규칙
- 위 집계에 있는 수치/키만 사용하세요 (환각 금지)
- 집계로 답할 수 없으면 "해당 데이터에서 확인할 수 없습니다"로 답하세요
- 수치는 집계 값 그대로 인용하세요
- chart_data는 집계의 top-N 중 관련 항목을 사용하세요

## 반드시 아래 JSON만 출력:
{
  "researcher": "policy_researcher",
  "activated": true,
  "found": true,
  "summary": "분석 결과 한국어 요약 (2-3문장)",
  "data_rows": [관련 집계 항목 최대 10개],
  "chart_suggestion": "bar",
  "chart_data": [{"label": "...", "value": 0}],
  "confidence": 0.9
}`;
}

export async function research(
  question: string,
  hint: string,
  _keywords: string[] = [],
): Promise<ResearcherResponse> {
  try {
    const [profiles, headers, coverages] = await Promise.all([
      loadCSV("customer_profiles.csv"),
      loadCSV("policy_headers.csv"),
      loadCSV("policy_coverages.csv"),
    ]);

    const aggs = computeAggregations(profiles, headers, coverages);
    const raw = await callGeminiJSON<Partial<ResearcherResponse>>(
      buildPrompt(question, hint, aggs),
    );
    return normalizeResearcherResponse(raw, RESEARCHER, SOURCE_FILES);
  } catch (err) {
    return fallbackResponse(
      RESEARCHER,
      `보험계약 리서처 오류: ${(err as Error).message}`,
      SOURCE_FILES,
    );
  }
}
