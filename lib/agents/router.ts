import { callGeminiJSON } from "../gemini";
import type { QueryPlan } from "../types";

const ROUTER_PROMPT = `당신은 보험 데이터 BI 시스템의 쿼리 라우터입니다.

사용자의 자연어 질문을 분석하여, 어떤 리서처 에이전트를 활성화할지 결정하세요.

## 사용 가능한 리서처
1. product_researcher: 보험 상품 카탈로그 (상품명, 카테고리, 보험료, 보장내용)
2. policy_researcher: 고객 프로필 + 계약 정보 + 보장 내역 (고객 속성, 가입 이력, 보장 구성)
3. loss_ratio_researcher: 손해율 시계열 데이터 (보험사별/기간별 손해율 추이)
4. investment_researcher: 투자 상품, 고객 보유 현황, NAV 추이, 리스크 프로필, 벤치마크, 거래 내역

## CSV 스키마 요약 (리서처별 사용 데이터)

### product_researcher
- products_catalog.csv: 상품코드, 보험사(광화종합|다올화재|동백해상|백두손해|이레생명|청우손해|한빛생명|삼산라이프), 상품명, 상품카테고리(실손|연금|종신|화재|어린이|여행자|자동차), 타겟연령, 월보험료_기준(숫자), 기준보험료_원(숫자), 보험료납입주기, 기준프로필, 주요보장1, 주요보장2, 주요보장3, 특약옵션, 가입조건

### policy_researcher
- customer_profiles.csv: customer_id, age(숫자 20~80), gender(남성|여성), occupation(IT개발자|교사|주부|학생|공무원|사무직|생산직|은퇴자|의료진|자영업|전문직|프리랜서), family_structure(1인가구|신혼부부|맞벌이자녀1|맞벌이자녀2|외벌이자녀2|편부모가정|3세대가구), income_band(300만원이하|300-500만원|500-800만원|800-1200만원|1200만원이상), residence_region, driver_status, persona_cluster, child_count(숫자), homeowner_flag, priority_need_1, priority_need_2, needs_tags
- policy_headers.csv: policy_id, customer_id, product_code, product_name, insurer, category(실손|연금|종신|화재|어린이|여행자|자동차), status, start_date(YYYY-MM-DD), monthly_premium(숫자), scenario_code
- policy_coverages.csv: policy_id, coverage_code, coverage_name, coverage_group(사망보장|실손의료|자동차배상|자차손해|화재재산|노후연금|특약보강|여행자보장|자녀상해질병), insured_amount, deductible_flag, rider_flag

### loss_ratio_researcher
- loss_ratio_timeseries.csv: 연월(YYYY-MM), 보험사(광화종합|다올화재|동백해상|백두손해|이레생명|청우손해|한빛생명|삼산라이프), 상품카테고리(실손|연금|종신|화재|어린이|여행자|자동차), 연령대, 성별(남성|여성), 가입건수(숫자), 청구건수(숫자), 경과보험료_원(숫자), 청구금액_원(숫자), 손해율(%)(숫자)

### investment_researcher
- investment_products.csv: product_id, product_name, product_type(ETF|펀드|연금|변액보험), asset_class(국내주식|국내채권|해외주식|해외채권|원자재|부동산리츠|혼합형), provider, risk_grade, annual_fee_pct(숫자), min_subscription_won(숫자), launch_date, benchmark, distribution_type, base_nav, description
- customer_holdings.csv: customer_id, product_id, units, avg_cost_nav, opened_date, auto_invest_flag
- nav_timeseries.csv: product_id, date(YYYY-MM-DD), nav(숫자), daily_return_pct(숫자)
- risk_profiles.csv: customer_id, risk_score(숫자), risk_label(저위험|초저위험|중립형|적극형|공격형), investment_horizon(1년이하|1-3년|3-5년|5-10년|10년이상), monthly_invest_capacity_won(숫자), primary_goal, survey_date
- market_benchmarks.csv: index_name, month, close, monthly_return_pct
- transactions.csv: tx_id, customer_id, product_id, tx_date, tx_type, units, nav_at_tx, amount_won, channel

## analysis_hint 작성 규칙
- analysis_hint에는 반드시 위 스키마의 **실제 컬럼명과 실제 값**을 사용하세요.
- 필터 조건이 있으면 "컬럼명=값" 또는 "컬럼명 범위 a~b" 형식으로 구체적으로 명시하세요.
  예: "customer_profiles.age 30~39, customer_profiles.gender=남성으로 필터 후 policy_headers.category별 집계"
- 모르는 값이나 스키마에 없는 컬럼을 만들어내지 마세요.

## keywords 작성 규칙
- keywords에는 CSV에 실제 등장하는 단어만 넣으세요 (상품명, 보험사명, 카테고리명, 보장명 등).
- 스키마의 괄호 안 enum 값을 참고하세요.

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
  "analysis_hint": "실제 컬럼명과 값을 포함한 구체적 분석 지시"
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
