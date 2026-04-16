import { callGeminiJSON } from "../gemini";
import type { QueryPlan } from "../types";

const ROUTER_PROMPT = `당신은 보험 데이터 BI 시스템의 쿼리 라우터입니다.

사용자의 자연어 질문을 분석하여, 어떤 리서처 에이전트를 활성화할지 결정하세요.

## 사용 가능한 리서처
1. product_researcher: 보험 상품 카탈로그 (상품명, 카테고리, 보험료, 보장내용)
2. policy_researcher: 고객 프로필 + 계약 정보 + 보장 내역 (고객 속성, 가입 이력, 보장 구성)
3. loss_ratio_researcher: 손해율 시계열 데이터 (보험사별/기간별 손해율 추이)
4. investment_researcher: 투자 상품, 고객 보유 현황, NAV 추이, 리스크 프로필, 벤치마크, 거래 내역

## 거절 기준
다음에 해당하면 rejected: true 로 설정:
- 미래 예측 요청 (주가, 환율 등)
- 제공된 데이터로 답할 수 없는 질문
- 개인정보 유출 우려 질문

## 반드시 아래 JSON만 출력하세요 (다른 텍스트 없이):
{
  "rejected": false,
  "reject_reason": null,
  "researchers": ["product_researcher", "policy_researcher"],
  "intent": "사용자 의도 한 줄 요약",
  "keywords": ["키워드1", "키워드2"],
  "analysis_hint": "리서처들에게 전달할 분석 힌트"
}

## 사용자 질문
`;

export async function routeQuery(question: string): Promise<QueryPlan> {
  try {
    const plan = await callGeminiJSON<QueryPlan>(ROUTER_PROMPT + question);
    return {
      rejected: Boolean(plan.rejected),
      reject_reason: plan.reject_reason ?? null,
      researchers: Array.isArray(plan.researchers) ? plan.researchers : [],
      intent: plan.intent ?? "",
      keywords: Array.isArray(plan.keywords) ? plan.keywords : [],
      analysis_hint: plan.analysis_hint ?? "",
    };
  } catch (err) {
    return {
      rejected: true,
      reject_reason: `라우터 오류: ${(err as Error).message}`,
      researchers: [],
      intent: "",
      keywords: [],
      analysis_hint: "",
    };
  }
}
