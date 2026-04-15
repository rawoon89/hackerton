# CLAUDE.md — 멀티 리서처 BI 프로젝트

## 프로젝트 개요
보험사 내부용 자연어 BI 웹앱. 사용자가 자연어로 질문하면 4개 리서처 에이전트가 각자 맡은 CSV 데이터를 탐색하고, 편집자가 통합 답변 + 차트를 제공한다.

## 절대 규칙
- **LLM 호출은 반드시 Gemini API만 사용** (OpenAI/Anthropic API 호출 금지)
- **환각 금지**: 화면에 표시되는 모든 데이터(상품명, 고객ID, 수치)는 `./data/` CSV에 실제로 존재하는 값만 사용
- **API 키는 .env에만 저장**, 코드/커밋에 절대 포함하지 않음
- **외부 데이터 금지**: `./data/` 폴더 내 파일만 사용

## 기술 스택
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Recharts (차트)
- Papa Parse (CSV 파싱)
- Vercel AI SDK + Google Generative AI SDK
- Lucide React (아이콘)
- Vercel 배포 (api/* 서버리스 함수)

## 프로젝트 구조
```
/
├── app/
│   ├── page.tsx                 # 메인 UI
│   ├── layout.tsx               # 레이아웃
│   └── api/
│       └── query/
│           └── route.ts         # 메인 API 엔드포인트
├── lib/
│   ├── gemini.ts                # Gemini API 클라이언트 래퍼
│   ├── csv-loader.ts            # CSV 파싱 유틸리티
│   ├── agents/
│   │   ├── router.ts            # Router Agent (쿼리 플래너)
│   │   ├── product-researcher.ts
│   │   ├── policy-researcher.ts
│   │   ├── loss-ratio-researcher.ts
│   │   ├── investment-researcher.ts
│   │   └── editor.ts            # Editor Agent (통합 답변 생성)
│   └── types.ts                 # 공통 타입 정의
├── components/
│   ├── QueryInput.tsx           # 질문 입력 + 샘플 버튼
│   ├── ResearcherCard.tsx       # 리서처 카드 (재사용)
│   ├── EditorResponse.tsx       # 편집자 통합 답변
│   ├── AutoChart.tsx            # 자동 차트 렌더링
│   └── CitationTable.tsx        # 인용 데이터 행
├── data/                        # CSV 데이터 (제공됨)
│   ├── products_catalog.csv
│   ├── customer_profiles.csv
│   ├── policy_headers.csv
│   ├── policy_coverages.csv
│   ├── loss_ratio_timeseries.csv
│   ├── investment_products.csv
│   ├── customer_holdings.csv
│   ├── nav_timeseries.csv
│   ├── risk_profiles.csv
│   ├── market_benchmarks.csv
│   └── transactions.csv
├── .env                         # GEMINI_API_KEY
├── spec.md
└── README.md
```

## 에이전트 아키텍처

### 처리 흐름
1. 사용자 질문 → API route (`/api/query`)
2. Router Agent: 질문 분석 → 쿼리 플랜 JSON
3. 활성화된 리서처들 병렬 실행 (Promise.allSettled)
4. 각 리서처: JS로 CSV 파싱/필터링 → 관련 데이터만 Gemini에 전달 → JSON 응답
5. Editor Agent: 모든 리서처 응답 종합 → 통합 답변 + 차트 타입 + 인용
6. 프론트엔드 렌더링

### 리서처 응답 JSON 스키마 (통일)
```json
{
  "researcher": "product | policy | loss_ratio | investment",
  "activated": true,
  "found": true,
  "summary": "한국어 요약 텍스트",
  "data_rows": [
    { "key": "value", ... }
  ],
  "chart_suggestion": "bar | line | pie | none",
  "confidence": 0.95
}
```

### Editor 응답 JSON 스키마
```json
{
  "answer": "통합 답변 텍스트 (한국어)",
  "chart": {
    "type": "bar | line | pie | none",
    "title": "차트 제목",
    "data": [ { "label": "...", "value": 123 } ]
  },
  "citations": [
    { "source": "products_catalog.csv", "row": { ... } }
  ],
  "rejected": false,
  "reject_reason": null
}
```

## CSV → JS 집계 전략 (중요!)
CSV를 통째로 Gemini에 넘기지 않는다. JS에서 먼저 처리:
1. Papa Parse로 CSV 파싱
2. 질문 키워드 기반으로 관련 행 필터링 (최대 50행)
3. 필요시 JS에서 집계(count, sum, avg, group by)
4. 필터링/집계된 결과만 Gemini 프롬프트에 포함

## 스타일 가이드
- 다크 테마 기반, 전문적이고 세련된 BI 대시보드 느낌
- 리서처 카드: 각각 고유 accent 색상, 로딩 시 skeleton/pulse 애니메이션
- 차트: Recharts, 다크 테마 호환 색상 팔레트
- 한국어 UI, Pretendard 폰트

## 샘플 질문 5개
1. "30대 남성 고객이 가장 많이 가입한 상품 카테고리는?"
2. "최근 12개월 손해율이 가장 악화된 보험사는?"
3. "적극형 고객의 평균 월 투자 가용금액은?"
4. "자녀 둘 이상 가구가 관심 있는 보장은?"
5. "내일 주가가 오를까?" (거절 케이스)

## 커밋 전략
- 동작하는 상태마다 즉시 커밋
- 커밋 메시지: "feat: ..." / "fix: ..." / "style: ..."
