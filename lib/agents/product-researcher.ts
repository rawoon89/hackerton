import { callGeminiJSON } from "../gemini";
import { loadCSV } from "../csv-loader";
import type { ResearcherResponse } from "../types";
import {
  fallbackResponse,
  filterByKeywords,
  limitRows,
  normalizeResearcherResponse,
} from "./utils";

const SOURCE_FILES = ["products_catalog.csv"];
const RESEARCHER = "product_researcher" as const;

function buildPrompt(
  question: string,
  hint: string,
  filteredData: Record<string, string>[],
): string {
  return `당신은 보험 상품 카탈로그 전문 리서처입니다.

## 데이터
아래는 products_catalog.csv에서 필터링된 데이터입니다:
${JSON.stringify(filteredData, null, 2)}

## 사용자 질문
${question}

## 분석 힌트
${hint}

## 규칙
- 반드시 제공된 데이터에 있는 값만 사용하세요
- 데이터에 없는 내용은 "해당 데이터에서 확인할 수 없습니다"로 답하세요
- 수치는 정확하게, 상품명은 데이터 원본 그대로 인용하세요

## 반드시 아래 JSON만 출력하세요:
{
  "researcher": "product_researcher",
  "activated": true,
  "found": true,
  "summary": "분석 결과 한국어 요약 (2-3문장)",
  "data_rows": [],
  "chart_suggestion": "bar",
  "chart_data": [{"label": "...", "value": 0}],
  "confidence": 0.9
}`;
}

export async function research(
  question: string,
  hint: string,
  keywords: string[] = [],
): Promise<ResearcherResponse> {
  try {
    const rows = await loadCSV("products_catalog.csv");
    const filtered = limitRows(filterByKeywords(rows, keywords));

    if (filtered.length === 0) {
      return fallbackResponse(
        RESEARCHER,
        "질문과 관련된 보험 상품을 찾을 수 없습니다.",
        SOURCE_FILES,
      );
    }

    const raw = await callGeminiJSON<Partial<ResearcherResponse>>(
      buildPrompt(question, hint, filtered),
    );
    return normalizeResearcherResponse(raw, RESEARCHER, SOURCE_FILES);
  } catch (err) {
    return fallbackResponse(
      RESEARCHER,
      `상품 리서처 오류: ${(err as Error).message}`,
      SOURCE_FILES,
    );
  }
}
