export type ResearcherName =
  | "product_researcher"
  | "policy_researcher"
  | "loss_ratio_researcher"
  | "investment_researcher";

export type ChartType = "bar" | "line" | "pie" | "none";

export interface QueryPlan {
  rejected: boolean;
  reject_reason: string | null;
  researchers: ResearcherName[];
  intent: string;
  keywords: string[];
  analysis_hint: string;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ResearcherResponse {
  researcher: ResearcherName;
  activated: boolean;
  found: boolean;
  summary: string;
  data_rows: Record<string, unknown>[];
  chart_suggestion: ChartType;
  chart_data: ChartPoint[];
  confidence: number;
  source_files?: string[];
  error?: string;
}

export interface Citation {
  source: string;
  row: Record<string, unknown>;
}

export interface EditorResponse {
  answer: string;
  chart: {
    type: ChartType;
    title: string;
    data: ChartPoint[];
  };
  citations: Citation[];
  rejected?: boolean;
  reject_reason?: string | null;
}
