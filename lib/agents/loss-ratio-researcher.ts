import { callGeminiJSON } from "../gemini";
import { loadCSV, type CSVRow } from "../csv-loader";
import type { ResearcherResponse } from "../types";
import { fallbackResponse, normalizeResearcherResponse } from "./utils";
import { numericField } from "./aggregations";

const SOURCE_FILES = ["loss_ratio_timeseries.csv"];
const RESEARCHER = "loss_ratio_researcher" as const;

interface InsurerStat {
  insurer: string;
  recent_12m_loss_ratio: number;
  prev_12m_loss_ratio: number;
  delta_pp: number;
  overall_loss_ratio: number;
  max_segment_loss_ratio: number;
  recent_12m_premium_won: number;
  recent_12m_claim_won: number;
  prev_12m_premium_won: number;
  prev_12m_claim_won: number;
  sample_rows: number;
}

interface Accumulator {
  premium: number;
  claim: number;
  rows: number;
}

function emptyAcc(): Accumulator {
  return { premium: 0, claim: 0, rows: 0 };
}

function ratio(a: Accumulator): number {
  if (a.premium <= 0) return 0;
  return (a.claim / a.premium) * 100;
}

function computeAggregations(rows: CSVRow[]) {
  const months = Array.from(new Set(rows.map((r) => r["연월"]))).sort();
  const recent12 = new Set(months.slice(-12));
  const prev12 = new Set(months.slice(-24, -12));

  const byInsurer: Record<
    string,
    { all: Accumulator; recent: Accumulator; prev: Accumulator; max: number }
  > = {};

  for (const r of rows) {
    const ins = r["보험사"];
    if (!ins) continue;
    const premium = numericField(r, "경과보험료_원");
    const claim = numericField(r, "청구금액_원");
    const lr = numericField(r, "손해율(%)");
    if (premium === null || claim === null) continue;

    const bucket = (byInsurer[ins] ||= {
      all: emptyAcc(),
      recent: emptyAcc(),
      prev: emptyAcc(),
      max: -Infinity,
    });

    bucket.all.premium += premium;
    bucket.all.claim += claim;
    bucket.all.rows += 1;
    if (lr !== null && lr > bucket.max) bucket.max = lr;

    const month = r["연월"];
    if (recent12.has(month)) {
      bucket.recent.premium += premium;
      bucket.recent.claim += claim;
      bucket.recent.rows += 1;
    } else if (prev12.has(month)) {
      bucket.prev.premium += premium;
      bucket.prev.claim += claim;
      bucket.prev.rows += 1;
    }
  }

  const round2 = (n: number) => +n.toFixed(2);

  const insurerStats: InsurerStat[] = Object.entries(byInsurer).map(
    ([insurer, b]) => {
      const recent = ratio(b.recent);
      const prev = ratio(b.prev);
      return {
        insurer,
        recent_12m_loss_ratio: round2(recent),
        prev_12m_loss_ratio: round2(prev),
        delta_pp: round2(recent - prev),
        overall_loss_ratio: round2(ratio(b.all)),
        max_segment_loss_ratio: round2(b.max),
        recent_12m_premium_won: b.recent.premium,
        recent_12m_claim_won: b.recent.claim,
        prev_12m_premium_won: b.prev.premium,
        prev_12m_claim_won: b.prev.claim,
        sample_rows: b.all.rows,
      };
    },
  );

  return {
    total_rows: rows.length,
    month_range: { first: months[0], last: months[months.length - 1] },
    recent_12_months: Array.from(recent12).sort(),
    prev_12_months: Array.from(prev12).sort(),
    aggregation_method:
      "weighted average — Σ(청구금액_원) / Σ(경과보험료_원) × 100",
    insurer_worsening_ranked: [...insurerStats].sort(
      (a, b) => b.delta_pp - a.delta_pp,
    ),
    insurer_highest_recent_ranked: [...insurerStats].sort(
      (a, b) => b.recent_12m_loss_ratio - a.recent_12m_loss_ratio,
    ),
  };
}

function buildPrompt(
  question: string,
  hint: string,
  aggs: ReturnType<typeof computeAggregations>,
): string {
  return `당신은 손해율 분석 전문 리서처입니다.
JS에서 loss_ratio_timeseries.csv 전체 행(${aggs.total_rows}행)을 보험사별로 시계열 집계했습니다.

## 사전 집계
${JSON.stringify(aggs, null, 2)}

## 사용자 질문
${question}

## 분석 힌트
${hint}

## 규칙
- 위 집계에 있는 수치만 사용 (환각 금지)
- 손해율은 **경과보험료 가중 합산** (Σ청구/Σ경과 × 100)으로 계산된 실제 포트폴리오 손해율입니다
- "악화" = 손해율 상승(delta_pp 양수)
- "개선" = 손해율 하락(delta_pp 음수)
- "최근 12개월" = recent_12_months (예: 2025-01 ~ 2025-12)
- insurer_worsening_ranked의 첫 항목이 가장 악화된 보험사입니다
- 반드시 숫자는 집계값 그대로 인용 (recent_12m_loss_ratio, prev_12m_loss_ratio, delta_pp)

## 반드시 아래 JSON만 출력:
{
  "researcher": "loss_ratio_researcher",
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
    const rows = await loadCSV("loss_ratio_timeseries.csv");
    if (rows.length === 0) {
      return fallbackResponse(
        RESEARCHER,
        "손해율 데이터가 비어 있습니다.",
        SOURCE_FILES,
      );
    }
    const aggs = computeAggregations(rows);
    const raw = await callGeminiJSON<Partial<ResearcherResponse>>(
      buildPrompt(question, hint, aggs),
    );
    return normalizeResearcherResponse(raw, RESEARCHER, SOURCE_FILES);
  } catch (err) {
    return fallbackResponse(
      RESEARCHER,
      `손해율 리서처 오류: ${(err as Error).message}`,
      SOURCE_FILES,
    );
  }
}
