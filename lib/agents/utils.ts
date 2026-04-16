import type { CSVRow } from "../csv-loader";
import type { ResearcherName, ResearcherResponse } from "../types";

export function matchesKeywords(row: CSVRow, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const haystack = Object.values(row).join(" ").toLowerCase();
  return keywords.some((k) => k && haystack.includes(k.toLowerCase()));
}

export function filterByKeywords(rows: CSVRow[], keywords: string[]): CSVRow[] {
  return rows.filter((r) => matchesKeywords(r, keywords));
}

export function limitRows<T>(rows: T[], max = 50): T[] {
  return rows.slice(0, max);
}

export function fallbackResponse(
  researcher: ResearcherName,
  message: string,
  sourceFiles: string[],
): ResearcherResponse {
  return {
    researcher,
    activated: true,
    found: false,
    summary: message,
    data_rows: [],
    chart_suggestion: "none",
    chart_data: [],
    confidence: 0,
    source_files: sourceFiles,
    error: message,
  };
}

export function normalizeResearcherResponse(
  raw: Partial<ResearcherResponse>,
  researcher: ResearcherName,
  sourceFiles: string[],
): ResearcherResponse {
  return {
    researcher,
    activated: true,
    found: Boolean(raw.found),
    summary: raw.summary ?? "",
    data_rows: Array.isArray(raw.data_rows) ? raw.data_rows : [],
    chart_suggestion: raw.chart_suggestion ?? "none",
    chart_data: Array.isArray(raw.chart_data) ? raw.chart_data : [],
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
    source_files: sourceFiles,
  };
}
