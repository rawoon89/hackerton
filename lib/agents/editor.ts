import { callGeminiJSON } from "../gemini";
import type {
  ChartType,
  Citation,
  EditorResponse,
  ResearcherResponse,
} from "../types";

const CHART_PRIORITY: ChartType[] = ["line", "bar", "pie", "none"];

function buildPrompt(
  question: string,
  responses: ResearcherResponse[],
): string {
  return `당신은 보험 데이터 BI 시스템의 편집자입니다.
4명의 리서처가 분석한 결과를 종합하여 사용자에게 최종 답변을 제공하세요.

## 리서처 분석 결과
${JSON.stringify(responses, null, 2)}

## 사용자 원래 질문
${question}

## 규칙
- 활성화된 리서처들의 결과만 종합하세요
- 리서처가 제시한 수치와 데이터를 정확히 인용하세요
- 답변은 한국어로, 전문적이지만 이해하기 쉽게 작성하세요
- 차트는 가장 적합한 하나만 선택하세요
- 인용(citations)에는 실제 데이터 행을 포함하세요

## 반드시 아래 JSON만 출력하세요:
{
  "answer": "통합 답변 (한국어, 3-5문장, 마크다운 지원)",
  "chart": {
    "type": "bar | line | pie | none",
    "title": "차트 제목",
    "data": [{"label": "항목", "value": 0}]
  },
  "citations": [
    {"source": "파일명.csv", "row": {}}
  ]
}`;
}

function pickBestChart(responses: ResearcherResponse[]): {
  type: ChartType;
  title: string;
  data: EditorResponse["chart"]["data"];
} {
  const candidates = responses.filter(
    (r) => r.found && r.chart_suggestion !== "none" && r.chart_data.length > 0,
  );

  if (candidates.length === 0) {
    return { type: "none", title: "", data: [] };
  }

  candidates.sort((a, b) => {
    const pa = CHART_PRIORITY.indexOf(a.chart_suggestion);
    const pb = CHART_PRIORITY.indexOf(b.chart_suggestion);
    if (pa !== pb) return pa - pb;
    return b.confidence - a.confidence;
  });

  const best = candidates[0];
  return {
    type: best.chart_suggestion,
    title: best.summary.slice(0, 40),
    data: best.chart_data,
  };
}

function buildFallbackCitations(
  responses: ResearcherResponse[],
): Citation[] {
  const citations: Citation[] = [];
  for (const r of responses) {
    if (!r.found) continue;
    const file = r.source_files?.[0] ?? `${r.researcher}.csv`;
    for (const row of r.data_rows.slice(0, 3)) {
      citations.push({ source: file, row: row as Record<string, unknown> });
    }
  }
  return citations;
}

function fallbackEditor(
  question: string,
  responses: ResearcherResponse[],
  reason: string,
): EditorResponse {
  const found = responses.filter((r) => r.found);
  const answer =
    found.length === 0
      ? `죄송합니다. 제공된 데이터로는 "${question}"에 대한 답변을 생성할 수 없습니다. (${reason})`
      : found.map((r) => `- ${r.summary}`).join("\n");

  return {
    answer,
    chart: pickBestChart(responses),
    citations: buildFallbackCitations(responses),
  };
}

export async function synthesize(
  question: string,
  responses: ResearcherResponse[],
): Promise<EditorResponse> {
  const activeResponses = responses.filter((r) => r.activated);

  if (activeResponses.every((r) => !r.found)) {
    return fallbackEditor(
      question,
      responses,
      "활성 리서처 모두 결과를 찾지 못함",
    );
  }

  try {
    const raw = await callGeminiJSON<Partial<EditorResponse>>(
      buildPrompt(question, activeResponses),
    );

    const chart = raw.chart?.type ? raw.chart : pickBestChart(activeResponses);
    const citations =
      Array.isArray(raw.citations) && raw.citations.length > 0
        ? raw.citations
        : buildFallbackCitations(activeResponses);

    return {
      answer: raw.answer ?? "",
      chart: {
        type: chart.type ?? "none",
        title: chart.title ?? "",
        data: Array.isArray(chart.data) ? chart.data : [],
      },
      citations,
    };
  } catch (err) {
    return fallbackEditor(question, responses, (err as Error).message);
  }
}
