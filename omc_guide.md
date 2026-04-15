# OMC 해커톤 실행 가이드

## 🚀 Phase 1: 프로젝트 초기화 (0~10분)

### OMC 시작 프롬프트 (복붙용)

```
CLAUDE.md를 읽고 프로젝트를 세팅해줘.

1. Next.js 14 프로젝트를 생성해 (App Router, TypeScript, Tailwind CSS)
2. 필요한 패키지 설치: papaparse, @google/generative-ai, recharts, lucide-react
3. shadcn/ui 초기화 후 card, button, input, badge, skeleton 컴포넌트 추가
4. ./data/ 폴더에 CSV 파일들이 있어. 건들지 마.
5. .env 파일 생성 (GEMINI_API_KEY=여기에키입력)
6. .gitignore에 .env, node_modules 추가
7. 이 상태로 git init + 첫 커밋

프로젝트 구조는 CLAUDE.md의 구조를 따라줘.
```

---

## 🔨 Phase 2: 백엔드 (10~40분)

### 프롬프트 2-1: Gemini 클라이언트 + CSV 로더

```
lib/gemini.ts와 lib/csv-loader.ts를 만들어줘.

gemini.ts:
- @google/generative-ai 사용
- GEMINI_API_KEY를 process.env에서 읽기
- callGemini(prompt: string): Promise<string> 함수
- JSON 응답을 파싱하는 유틸 함수 (마크다운 코드블록 제거 포함)
- 모델은 gemini-2.0-flash 사용

csv-loader.ts:
- Papa Parse로 ./data/ 의 CSV 파일을 읽는 함수
- loadCSV(filename: string): Promise<Record<string, string>[]>
- filterRows(data, column, value): 특정 컬럼 필터링
- groupBy(data, column): 그룹별 집계
- 서버사이드에서만 동작 (fs.readFileSync 사용)
```

### 프롬프트 2-2: 에이전트 구현

```
lib/agents/ 폴더에 5개 에이전트를 구현해줘.
agent-prompts.md 파일을 참고해서 프롬프트를 작성해.

router.ts:
- routeQuery(question: string) → QueryPlan JSON
- 거절 케이스 판별 포함

product-researcher.ts:
- research(question, hint) → ResearcherResponse
- products_catalog.csv 로드 → 키워드 기반 필터링 → Gemini 호출

policy-researcher.ts:
- research(question, hint) → ResearcherResponse  
- customer_profiles + policy_headers + policy_coverages 교차 분석
- 고객ID 기준 조인 로직 포함

loss-ratio-researcher.ts:
- research(question, hint) → ResearcherResponse
- loss_ratio_timeseries.csv 시계열 분석

investment-researcher.ts:
- research(question, hint) → ResearcherResponse
- 6개 CSV 파일 종합 분석

editor.ts:
- synthesize(question, responses[]) → EditorResponse
- 차트 타입 자동 선택, 인용 데이터 행 포함

모든 에이전트는 lib/types.ts의 공통 타입을 사용.
에러 핸들링 필수 - Gemini 호출 실패 시 graceful fallback.

중요: CSV를 통째로 Gemini에 넘기지 말고, JS에서 먼저 필터링/집계 후 
관련 데이터(최대 50행)만 프롬프트에 포함해.
```

### 프롬프트 2-3: API 라우트

```
app/api/query/route.ts를 만들어줘.

POST /api/query
- body: { question: string }
- 처리 흐름:
  1. Router Agent로 쿼리 플랜 생성
  2. 거절이면 바로 거절 응답 반환
  3. 활성화된 리서처들을 Promise.allSettled로 병렬 실행
  4. Editor Agent로 통합 답변 생성
  5. 전체 결과 반환 (리서처 개별 결과 + 편집자 답변)

응답 형태:
{
  queryPlan: { ... },
  researchers: [ ... ],
  editor: { ... },
  rejected: false
}

에러 핸들링 꼼꼼히. 개별 리서처 실패해도 나머지는 정상 동작.
```

---

## 🎨 Phase 3: 프론트엔드 (40~90분)

### 프롬프트 3-1: 메인 페이지 + 컴포넌트

```
CLAUDE.md의 UI 구조와 스타일 가이드를 따라서 프론트엔드를 만들어줘.

app/page.tsx (메인):
- 다크 테마 BI 대시보드
- Pretendard 폰트 (Google Fonts)
- 상단: 앱 제목 + 질문 입력창
- 샘플 질문 5개 버튼 (클릭하면 자동 입력+실행)
- 중앙: 리서처 카드 4개 (2x2 그리드)
- 하단: 편집자 통합 답변 + 차트 + 인용 테이블

components/QueryInput.tsx:
- 텍스트 입력 + 전송 버튼
- 로딩 중 disabled 처리
- 샘플 질문 칩 버튼들

components/ResearcherCard.tsx:
- 리서처 이름 + 아이콘 + 상태 표시
- 상태: idle / loading (skeleton) / success / skipped / error
- 각 리서처별 accent 색상 (product=blue, policy=green, loss=red, investment=amber)
- 결과 요약 텍스트 표시

components/EditorResponse.tsx:
- 통합 답변 마크다운 렌더링
- 거절 시 정중한 거절 메시지 UI

components/AutoChart.tsx:
- Recharts로 bar/line/pie 자동 렌더링
- 차트 타입에 따라 적절한 컴포넌트 선택
- 다크 테마 색상

components/CitationTable.tsx:
- 인용된 데이터 행을 테이블로 표시
- 출처 파일명 표시

전체적으로 세련된 다크 테마 BI 대시보드 느낌.
리서처 카드는 로딩 시 pulse 애니메이션, 완료 시 fade-in.
```

---

## 🚢 Phase 4: 배포 + 마무리 (90~120분)

### 프롬프트 4-1: Vercel 배포 확인

```
Vercel 배포 전 체크리스트:
1. .env.local → Vercel 환경변수로 GEMINI_API_KEY 설정 확인
2. next.config.js에 서버리스 함수 설정 확인
3. ./data/ CSV 파일이 빌드에 포함되는지 확인
4. npm run build 에러 없는지 확인
5. 샘플 질문 5개 모두 테스트
```

### 프롬프트 4-2: README.md 생성

```
README.md를 작성해줘. 다음 내용 포함:
- 프로젝트 요약 (멀티 리서처 BI)
- 기술 스택 목록
- 로컬 실행 방법 (npm install → .env 설정 → npm run dev)
- 5 에이전트 프롬프트 설계 요약
- 완성 기준 체크리스트 결과
- 샘플 질문 테스트 결과 스크린샷 설명
```

---

## ⚠️ 해커톤 중 주의사항

1. **매 Phase 끝날 때마다 git commit** — 롤백 보험
2. **Gemini API 에러 시**: rate limit 가능성 → 잠시 대기 후 재시도
3. **CSV 파싱 에러 시**: 인코딩 확인 (UTF-8), 헤더 행 확인
4. **Vercel 배포 실패 시**: build 로그 확인, 서버리스 함수 타임아웃(10초) 주의
5. **시간 부족 시 우선순위**: 
   - 최소한 1개 샘플 질문이 동작 > 4개 전부 동작
   - 차트 없어도 됨 > 텍스트 답변이라도 나오게
   - UI 예쁜 것 < 정확한 데이터 답변
