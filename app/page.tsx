"use client";

import { Activity } from "lucide-react";
import { useState } from "react";
import { EditorResponse } from "@/components/EditorResponse";
import { QueryInput } from "@/components/QueryInput";
import { ResearcherCard } from "@/components/ResearcherCard";
import type {
  EditorResponse as EditorResponseType,
  QueryPlan,
  ResearcherName,
  ResearcherResponse,
} from "@/lib/types";

const SAMPLE_QUESTIONS = [
  "30대 남성 고객이 가장 많이 가입한 상품 카테고리는?",
  "최근 12개월 손해율이 가장 악화된 보험사는?",
  "적극형 고객의 평균 월 투자 가용금액은?",
  "자녀 둘 이상 가구가 관심 있는 보장은?",
  "내일 주가가 오를까?",
];

const RESEARCHER_ORDER: ResearcherName[] = [
  "product_researcher",
  "policy_researcher",
  "loss_ratio_researcher",
  "investment_researcher",
];

interface ApiResponse {
  queryPlan: QueryPlan;
  researchers: ResearcherResponse[];
  editor: EditorResponseType;
  rejected: boolean;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runQuery(q: string) {
    setLoading(true);
    setQuestion(q);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ApiResponse;
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function cardState(
    name: ResearcherName,
  ): "idle" | "loading" | "success" | "skipped" | "error" {
    if (loading) return "loading";
    if (!result) return "idle";
    if (result.rejected) return "skipped";
    const r = result.researchers.find((x) => x.researcher === name);
    if (!r || !r.activated) return "skipped";
    if (r.error) return "error";
    if (r.found) return "success";
    return "error";
  }

  function cardResponse(name: ResearcherName) {
    return result?.researchers.find((r) => r.researcher === name);
  }

  return (
    <main className="min-h-screen relative">
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 35% at 50% -10%, rgba(250,102,0,0.05), transparent 70%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 py-10 space-y-8">
        <header className="flex items-center justify-between pb-6 border-b border-[color:var(--hanwha-line)]">
          <div className="flex items-center gap-5">
            <div
              className="h-16 w-[148px] bg-no-repeat bg-center"
              style={{
                backgroundImage: "url(/hanwha-logo.jpg)",
                backgroundSize: "auto 240%",
                backgroundPosition: "center 62%",
              }}
              role="img"
              aria-label="한화생명"
            />
            <div className="border-l border-[color:var(--hanwha-line)] pl-5">
              <div className="text-[10px] font-bold tracking-[0.2em] text-[color:var(--hanwha-orange)] uppercase">
                Insight BI
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[color:var(--hanwha-ink)] mt-1">
                인사이트 BI 대시보드
              </h1>
              <p className="text-xs text-[color:var(--hanwha-gray)] mt-0.5">
                자연어로 묻고, 4명의 리서처가 답합니다
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[color:var(--hanwha-gray)]">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-medium">4 Researchers · 1 Editor</span>
          </div>
        </header>

        <QueryInput
          onSubmit={runQuery}
          loading={loading}
          samples={SAMPLE_QUESTIONS}
        />

        {result?.queryPlan && !result.rejected && (
          <div className="glass-card rounded-xl px-5 py-3 fade-in flex items-center gap-4 text-xs flex-wrap">
            <span className="text-[color:var(--hanwha-orange)] font-semibold uppercase tracking-widest">
              Router
            </span>
            <span className="text-[color:var(--hanwha-gray)]">
              {result.queryPlan.intent}
            </span>
            <div className="flex gap-1.5 ml-auto flex-wrap">
              {result.queryPlan.keywords.map((k, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-[color:var(--secondary)] text-[color:var(--hanwha-gray)]"
                >
                  #{k}
                </span>
              ))}
            </div>
          </div>
        )}

        {question && (
          <div className="fade-in">
            <div className="text-xs text-[color:var(--hanwha-gray)] mb-1">
              질문
            </div>
            <div className="text-lg font-medium">{question}</div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/5 px-5 py-4 text-sm text-red-400">
            요청 실패: {error}
          </div>
        )}

        {(loading || result) && (
          <section>
            <div className="text-xs font-semibold tracking-widest text-[color:var(--hanwha-gray)] uppercase mb-3">
              Researchers
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RESEARCHER_ORDER.map((name) => (
                <ResearcherCard
                  key={name}
                  name={name}
                  state={cardState(name)}
                  response={cardResponse(name)}
                />
              ))}
            </div>
          </section>
        )}

        {result?.editor && (
          <section>
            <div className="text-xs font-semibold tracking-widest text-[color:var(--hanwha-gray)] uppercase mb-3">
              Final Answer
            </div>
            <EditorResponse response={result.editor} />
          </section>
        )}

        {!loading && !result && !error && (
          <div className="text-center py-16 text-[color:var(--hanwha-gray)]">
            <div className="text-sm">
              질문을 입력하거나 위 샘플 질문을 선택하세요
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
