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
          className="w-full rounded-full bg-white border border-[color:var(--hanwha-line)] px-7 py-5 pr-40 text-base text-[color:var(--hanwha-ink)] placeholder:text-[color:var(--hanwha-gray)] focus:outline-none focus:border-[color:var(--hanwha-orange)] focus:ring-4 focus:ring-[color:var(--hanwha-peach)] transition disabled:opacity-60 shadow-[0_2px_8px_rgba(39,43,47,0.04)]"
        />
        <button
          onClick={submit}
          disabled={loading || !value.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 hanwha-solid font-semibold px-6 py-3 rounded-full flex items-center gap-2 hover:brightness-95 active:brightness-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
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

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[11px] font-semibold tracking-widest text-[color:var(--hanwha-gray)] uppercase mr-2">
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
            className="text-xs px-4 py-2 rounded-full border border-[color:var(--hanwha-line)] bg-white hover:border-[color:var(--hanwha-orange)] hover:bg-[color:var(--hanwha-peach)] hover:text-[color:var(--hanwha-orange)] text-[color:var(--hanwha-gray)] transition disabled:opacity-40 font-medium"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
