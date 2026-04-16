import { callGeminiJSON } from "../gemini";
import { loadCSV, type CSVRow } from "../csv-loader";
import type { ResearcherResponse } from "../types";
import { fallbackResponse, normalizeResearcherResponse } from "./utils";
import { avg, countBy, numericField, topN } from "./aggregations";

const SOURCE_FILES = [
  "investment_products.csv",
  "customer_holdings.csv",
  "nav_timeseries.csv",
  "risk_profiles.csv",
  "market_benchmarks.csv",
  "transactions.csv",
];
const RESEARCHER = "investment_researcher" as const;

function computeAggregations(
  products: CSVRow[],
  holdings: CSVRow[],
  nav: CSVRow[],
  risk: CSVRow[],
  benchmarks: CSVRow[],
  transactions: CSVRow[],
) {
  const byRisk: Record<string, number[]> = {};
  for (const r of risk) {
    const cap = numericField(r, "monthly_invest_capacity_won");
    if (cap === null) continue;
    (byRisk[r.risk_label] ||= []).push(cap);
  }
  const formatKRW = (won: number): string => {
    if (won >= 100_000_000) return `약 ${(won / 100_000_000).toFixed(1)}억원`;
    if (won >= 10_000) return `약 ${(won / 10_000).toFixed(0)}만원`;
    return `${won}원`;
  };
  const riskLabelStats = Object.entries(byRisk).map(([label, arr]) => {
    const avgWon = Math.round(avg(arr));
    const minWon = Math.min(...arr);
    const maxWon = Math.max(...arr);
    return {
      risk_label: label,
      customer_count: arr.length,
      avg_monthly_invest_capacity_won: avgWon,
      avg_monthly_invest_capacity_label: formatKRW(avgWon),
      min_monthly_invest_capacity_won: minWon,
      min_monthly_invest_capacity_label: formatKRW(minWon),
      max_monthly_invest_capacity_won: maxWon,
      max_monthly_invest_capacity_label: formatKRW(maxWon),
    };
  });

  const horizonByRisk: Record<string, Record<string, number>> = {};
  for (const r of risk) {
    (horizonByRisk[r.risk_label] ||= {});
    horizonByRisk[r.risk_label][r.investment_horizon] =
      (horizonByRisk[r.risk_label][r.investment_horizon] ?? 0) + 1;
  }

  const productCountByType = countBy(products, (p) => p.product_type);
  const productCountByAssetClass = countBy(products, (p) => p.asset_class);

  const txByType = countBy(transactions, (t) => t.tx_type);
  const txAmountByType: Record<string, number> = {};
  for (const t of transactions) {
    const amt = numericField(t, "amount_won");
    if (amt === null) continue;
    txAmountByType[t.tx_type] = (txAmountByType[t.tx_type] ?? 0) + amt;
  }

  const benchmarksByIndex: Record<string, { count: number; last?: CSVRow }> =
    {};
  for (const b of benchmarks) {
    (benchmarksByIndex[b.index_name] ||= { count: 0 }).count += 1;
    benchmarksByIndex[b.index_name].last = b;
  }

  return {
    dataset_sizes: {
      investment_products: products.length,
      customer_holdings: holdings.length,
      nav_timeseries: nav.length,
      risk_profiles: risk.length,
      market_benchmarks: benchmarks.length,
      transactions: transactions.length,
    },
    risk_label_stats: riskLabelStats,
    investment_horizon_by_risk_label: horizonByRisk,
    product_count_by_type: productCountByType,
    product_count_by_asset_class: productCountByAssetClass,
    top_products_sample: products.slice(0, 10),
    transaction_count_by_type: txByType,
    transaction_total_won_by_type: txAmountByType,
    benchmark_indexes: Object.keys(benchmarksByIndex),
  };
}

function buildPrompt(
  question: string,
  hint: string,
  aggs: ReturnType<typeof computeAggregations>,
): string {
  return `당신은 투자 분석 전문 리서처입니다.
JS에서 6개 CSV(investment_products, customer_holdings, nav_timeseries, risk_profiles, market_benchmarks, transactions)를 사전 집계했습니다.

## 사전 집계
${JSON.stringify(aggs, null, 2)}

## 사용자 질문
${question}

## 분석 힌트
${hint}

## 규칙
- 위 집계에 있는 수치/키만 사용 (환각 금지)
- "적극형/공격형/중립형/저위험/초저위험" 등 risk_label은 risk_label_stats에서 찾으세요
- 평균/분포 질문은 집계 값을 그대로 인용
- **금액 단위 중요**: 모든 _won 필드는 한국 원(KRW) 단위입니다. 예: 1,061,695 = 약 106만원 (1.06 million won), 절대 10억으로 해석하지 마세요. 가능하면 _label 필드를 그대로 사용하세요

## 반드시 아래 JSON만 출력:
{
  "researcher": "investment_researcher",
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
    const [products, holdings, nav, risk, benchmarks, transactions] =
      await Promise.all([
        loadCSV("investment_products.csv"),
        loadCSV("customer_holdings.csv"),
        loadCSV("nav_timeseries.csv"),
        loadCSV("risk_profiles.csv"),
        loadCSV("market_benchmarks.csv"),
        loadCSV("transactions.csv"),
      ]);

    const aggs = computeAggregations(
      products,
      holdings,
      nav,
      risk,
      benchmarks,
      transactions,
    );

    const raw = await callGeminiJSON<Partial<ResearcherResponse>>(
      buildPrompt(question, hint, aggs),
    );
    return normalizeResearcherResponse(raw, RESEARCHER, SOURCE_FILES);
  } catch (err) {
    return fallbackResponse(
      RESEARCHER,
      `투자 리서처 오류: ${(err as Error).message}`,
      SOURCE_FILES,
    );
  }
}

// keep unused imports happy
void topN;
