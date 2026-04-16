import { routeQuery } from "../lib/agents/router";
import { research as researchProduct } from "../lib/agents/product-researcher";
import { research as researchPolicy } from "../lib/agents/policy-researcher";
import { research as researchLossRatio } from "../lib/agents/loss-ratio-researcher";
import { research as researchInvestment } from "../lib/agents/investment-researcher";
import { synthesize } from "../lib/agents/editor";
import type { ResearcherName, ResearcherResponse } from "../lib/types";

const RESEARCHERS: Record<
  ResearcherName,
  (q: string, h: string, k: string[]) => Promise<ResearcherResponse>
> = {
  product_researcher: researchProduct,
  policy_researcher: researchPolicy,
  loss_ratio_researcher: researchLossRatio,
  investment_researcher: researchInvestment,
};

function header(title: string) {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
}

async function runPipeline(question: string) {
  header(`Q: ${question}`);

  const plan = await routeQuery(question);
  console.log("[Router]", JSON.stringify(plan, null, 2));

  if (plan.rejected) {
    console.log("→ 거절됨, 파이프라인 종료");
    return;
  }

  const results = await Promise.allSettled(
    plan.researchers.map((name) =>
      RESEARCHERS[name](question, plan.analysis_hint, plan.keywords),
    ),
  );

  const responses: ResearcherResponse[] = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    console.log(`  ❌ ${plan.researchers[i]}:`, r.reason);
    return {
      researcher: plan.researchers[i],
      activated: true,
      found: false,
      summary: String(r.reason),
      data_rows: [],
      chart_suggestion: "none",
      chart_data: [],
      confidence: 0,
    };
  });

  for (const r of responses) {
    console.log(
      `[${r.researcher}] found=${r.found} conf=${r.confidence} rows=${r.data_rows.length}`,
    );
    console.log("  summary:", r.summary);
  }

  const editor = await synthesize(question, responses);
  console.log("[Editor]");
  console.log("  answer:", editor.answer);
  console.log(
    "  chart:",
    editor.chart.type,
    "-",
    editor.chart.title,
    `(${editor.chart.data.length} points)`,
  );
  console.log("  citations:", editor.citations.length);
}

async function main() {
  const questions = [
    "30대 남성 고객이 가장 많이 가입한 상품 카테고리는?",
    "최근 12개월 손해율이 가장 악화된 보험사는?",
    "적극형 고객의 평균 월 투자 가용금액은?",
    "자녀 둘 이상 가구가 관심 있는 보장은?",
    "내일 주가가 오를까?",
  ];
  for (const q of questions) {
    await runPipeline(q);
    await new Promise((r) => setTimeout(r, 15000));
  }
  console.log("\n✅ 에이전트 테스트 완료");
}

main().catch((err) => {
  console.error("❌ 에이전트 테스트 실패:", err);
  process.exit(1);
});
