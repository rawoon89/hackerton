import {
  callGemini,
  callGeminiJSON,
  getLastUsedModel,
  getModelChainStatus,
} from "../lib/gemini";

async function main() {
  console.log("[1/2] Plain text call...");
  const text = await callGemini("한 문장으로 자기소개해줘.");
  console.log("→", text.trim());

  console.log("\n[2/2] JSON call...");
  const json = await callGeminiJSON<{ city: string; country: string }>(
    '다음 JSON만 출력해: {"city": "서울", "country": "대한민국"}',
  );
  console.log("→", json);

  console.log("\n✅ Gemini 호출 정상");
  console.log("via:", getLastUsedModel());
  console.log("chain status:", getModelChainStatus());
}

main().catch((err) => {
  console.error("❌ Gemini 호출 실패:", err);
  process.exit(1);
});
