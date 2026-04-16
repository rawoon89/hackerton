"use client";

import { Ban, Sparkles } from "lucide-react";
import { AutoChart } from "./AutoChart";
import { CitationTable } from "./CitationTable";
import type { EditorResponse as EditorResponseType } from "@/lib/types";

interface Props {
  response: EditorResponseType;
}

export function EditorResponse({ response }: Props) {
  if (response.rejected) {
    return (
      <div className="glass-card rounded-2xl p-8 fade-in border-l-4 border-l-red-500/60">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <Ban className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-red-400 mb-1">
              답변이 제한된 질문입니다
            </div>
            <p className="text-sm text-[color:var(--foreground)] leading-relaxed">
              {response.answer ||
                "해당 질문은 제공된 데이터로 정확한 답변을 드릴 수 없습니다."}
            </p>
            {response.reject_reason && (
              <div className="mt-3 text-xs text-[color:var(--muted-foreground)]">
                사유: {response.reject_reason}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="glass-card p-8 fade-in relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 hanwha-solid" />
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full hanwha-solid flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="text-[11px] font-bold tracking-[0.18em] text-[color:var(--hanwha-orange)] uppercase">
            Editor Agent
          </div>
        </div>
        <div className="text-[15px] leading-[1.85] text-[color:var(--hanwha-ink)] whitespace-pre-wrap">
          {renderMarkdown(response.answer)}
        </div>
      </div>

      <AutoChart
        type={response.chart.type}
        title={response.chart.title}
        data={response.chart.data}
      />

      <CitationTable citations={response.citations} />
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong
          key={i}
          className="text-[color:var(--hanwha-orange)] font-bold"
        >
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}
