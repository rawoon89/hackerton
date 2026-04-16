import { NextRequest, NextResponse } from "next/server";

import { routeQuery } from "@/lib/agents/router";
import { synthesize } from "@/lib/agents/editor";
import { research as researchProduct } from "@/lib/agents/product-researcher";
import { research as researchPolicy } from "@/lib/agents/policy-researcher";
import { research as researchLossRatio } from "@/lib/agents/loss-ratio-researcher";
import { research as researchInvestment } from "@/lib/agents/investment-researcher";
import type {
  QueryPlan,
  ResearcherName,
  ResearcherResponse,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResearcherFn = (
  question: string,
  hint: string,
  keywords: string[],
) => Promise<ResearcherResponse>;

const RESEARCHER_MAP: Record<ResearcherName, ResearcherFn> = {
  product_researcher: researchProduct,
  policy_researcher: researchPolicy,
  loss_ratio_researcher: researchLossRatio,
  investment_researcher: researchInvestment,
};

function inactiveResponse(researcher: ResearcherName): ResearcherResponse {
  return {
    researcher,
    activated: false,
    found: false,
    summary: "",
    data_rows: [],
    chart_suggestion: "none",
    chart_data: [],
    confidence: 0,
  };
}

function errorResponse(
  researcher: ResearcherName,
  message: string,
): ResearcherResponse {
  return {
    researcher,
    activated: true,
    found: false,
    summary: `리서처 실행 실패: ${message}`,
    data_rows: [],
    chart_suggestion: "none",
    chart_data: [],
    confidence: 0,
    error: message,
  };
}

async function runResearchers(
  plan: QueryPlan,
  question: string,
): Promise<ResearcherResponse[]> {
  const allNames = Object.keys(RESEARCHER_MAP) as ResearcherName[];
  const activeSet = new Set(plan.researchers);

  const results = await Promise.allSettled(
    allNames.map((name) => {
      if (!activeSet.has(name)) {
        return Promise.resolve(inactiveResponse(name));
      }
      const fn = RESEARCHER_MAP[name];
      return fn(question, plan.analysis_hint, plan.keywords);
    }),
  );

  return results.map((r, idx) => {
    const name = allNames[idx];
    if (r.status === "fulfilled") return r.value;
    return errorResponse(name, (r.reason as Error)?.message ?? "unknown");
  });
}

export async function POST(req: NextRequest) {
  let question: string;
  try {
    const body = await req.json();
    question = String(body?.question ?? "").trim();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!question) {
    return NextResponse.json(
      { error: "question is required" },
      { status: 400 },
    );
  }

  try {
    const queryPlan = await routeQuery(question);

    if (queryPlan.rejected) {
      return NextResponse.json({
        queryPlan,
        researchers: [],
        editor: {
          answer:
            queryPlan.reject_reason ?? "해당 질문은 처리할 수 없습니다.",
          chart: { type: "none", title: "", data: [] },
          citations: [],
          rejected: true,
          reject_reason: queryPlan.reject_reason,
        },
        rejected: true,
      });
    }

    const researchers = await runResearchers(queryPlan, question);
    const editor = await synthesize(question, researchers);

    return NextResponse.json({
      queryPlan,
      researchers,
      editor,
      rejected: false,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Internal server error",
        message: (err as Error).message,
      },
      { status: 500 },
    );
  }
}
