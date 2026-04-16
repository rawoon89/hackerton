"use client";

import { Send, Sparkles } from "lucide-react";
import { useState } from "react";

interface Props {
  onSubmit: (question: string) => void;
  loading: boolean;
  samples: string[];
}

export function QueryInput({ onSubmit, loading, samples }: Props) {
  const [value, setValue] = useState("");

  function submit() {
    const q = value.trim();
    if (!q || loading) return;
    onSubmit(q);
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={loading}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="예) 30대 남성 고객이 가장 많이 가입한 상품 카테고리는?"
          className="w-full rounded-2xl bg-[color:var(--card)] border border-[color:var(--border)] px-6 py-5 pr-36 text-base text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:border-[color:var(--hanwha-orange)] focus:ring-2 focus:ring-[color:var(--hanwha-orange-dim)] transition disabled:opacity-60"
        />
        <button
          onClick={submit}
          disabled={loading || !value.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 hanwha-gradient text-white font-semibold px-5 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>분석 중</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>분석</span>
            </>
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-[color:var(--muted-foreground)] self-center mr-1">
          샘플 질문
        </span>
        {samples.map((s, i) => (
          <button
            key={i}
            disabled={loading}
            onClick={() => {
              setValue(s);
              onSubmit(s);
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--secondary)] hover:border-[color:var(--hanwha-orange)] hover:text-[color:var(--hanwha-orange)] text-[color:var(--muted-foreground)] transition disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
