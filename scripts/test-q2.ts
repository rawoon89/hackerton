import { routeQuery } from "../lib/agents/router";
import { research as researchLossRatio } from "../lib/agents/loss-ratio-researcher";
import { synthesize } from "../lib/agents/editor";
import { getLastUsedModel } from "../lib/gemini";

async function main() {
  const q = "최근 12개월 손해율이 가장 악화된 보험사는?";
  console.log("Q:", q);

  const plan = await routeQuery(q);
  console.log("\n[Router]", JSON.stringify(plan, null, 2));

  const lr = await researchLossRatio(q, plan.analysis_hint, plan.keywords);
  console.log("\n[loss_ratio_researcher]");
  console.log("  found:", lr.found, "conf:", lr.confidence);
  console.log("  summary:", lr.summary);
  console.log("  data_rows[0]:", lr.data_rows[0]);
  console.log("  chart_data (first 3):", lr.chart_data.slice(0, 3));

  const editor = await synthesize(q, [lr]);
  console.log("\n[Editor]");
  console.log("  answer:", editor.answer);
  console.log(
    "  chart:",
    editor.chart.type,
    "—",
    editor.chart.title,
    `(${editor.chart.data.length} pts)`,
  );

  console.log("\nvia:", getLastUsedModel());
}

main().catch((err) => {
  console.error("❌ 실패:", err);
  process.exit(1);
});
