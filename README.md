# 인사이트 BI 대시보드

자연어로 질문하면 4명의 AI 리서처가 보험 데이터를 분석하고, 편집자 에이전트가 통합 답변과 차트를 제공하는 BI 웹앱입니다.

## 주요 기능

- **자연어 질의**: 한국어로 자유롭게 질문
- **4개 리서처 에이전트**: 상품, 계약, 손해율, 투자 영역별 병렬 분석
- **편집자 에이전트**: 리서처 결과를 종합하여 통합 답변 생성
- **자동 차트**: 질의 결과에 맞는 Bar / Line / Pie 차트 자동 렌더링
- **인용 테이블**: 답변 근거 데이터를 CSV 출처와 함께 표시
- **거절 처리**: 미래 예측 등 답변 불가 질문은 사유와 함께 거절

## 아키텍처

```
사용자 질문
  → Router Agent (쿼리 플랜 생성)
  → 리서처 에이전트 병렬 실행 (CSV → JS 필터/집계 → Gemini)
  → Editor Agent (통합 답변 + 차트 + 인용)
  → 프론트엔드 렌더링
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS + shadcn/ui |
| 차트 | Recharts |
| CSV 파싱 | Papa Parse |
| LLM | Google Gemini API |
| 폰트 | Pretendard Variable |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 Gemini API 키를 추가합니다.

```
GEMINI_API_KEY=your_api_key_here
```

### 3. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## 프로젝트 구조

```
app/
├── page.tsx              # 메인 UI
├── layout.tsx            # 루트 레이아웃
├── globals.css           # 글로벌 스타일 + 테마 변수
└── api/query/route.ts    # 메인 API 엔드포인트

lib/
├── gemini.ts             # Gemini API 클라이언트
├── csv-loader.ts         # CSV 파싱 유틸리티
├── types.ts              # 공통 타입 정의
└── agents/
    ├── router.ts          # 쿼리 플래너
    ├── product-researcher.ts
    ├── policy-researcher.ts
    ├── loss-ratio-researcher.ts
    ├── investment-researcher.ts
    └── editor.ts          # 통합 답변 생성

components/
├── QueryInput.tsx        # 질문 입력 + 샘플 버튼
├── ResearcherCard.tsx    # 리서처 상태 카드
├── EditorResponse.tsx    # 편집자 통합 답변
├── AutoChart.tsx         # 자동 차트
└── CitationTable.tsx     # 인용 데이터 테이블

data/                     # CSV 데이터 (11개 파일)
```

## 샘플 질문

- 30대 남성 고객이 가장 많이 가입한 상품 카테고리는?
- 최근 12개월 손해율이 가장 악화된 보험사는?
- 적극형 고객의 평균 월 투자 가용금액은?
- 자녀 둘 이상 가구가 관심 있는 보장은?
- 내일 주가가 오를까? (거절 케이스)
