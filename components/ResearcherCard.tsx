"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MinusCircle,
  Package,
  Shield,
  TrendingDown,
  Wallet,
} from "lucide-react";
import type { ResearcherName, ResearcherResponse } from "@/lib/types";

type CardState = "idle" | "loading" | "success" | "skipped" | "error";

interface Props {
  name: ResearcherName;
  state: CardState;
  response?: ResearcherResponse;
}

const META: Record<
  ResearcherName,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    accentVar: string;
    desc: string;
  }
> = {
  product_researcher: {
    label: "상품 리서처",
    icon: Package,
    accent: "#3b82f6",
    accentVar: "var(--researcher-product)",
    desc: "상품 카탈로그 분석",
  },
  policy_researcher: {
    label: "계약 리서처",
    icon: Shield,
    accent: "#10b981",
    accentVar: "var(--researcher-policy)",
    desc: "고객·계약·보장 교차",
  },
  loss_ratio_researcher: {
    label: "손해율 리서처",
    icon: TrendingDown,
    accent: "#ef4444",
    accentVar: "var(--researcher-loss)",
    desc: "손해율 시계열 추이",
  },
  investment_researcher: {
    label: "투자 리서처",
    icon: Wallet,
    accent: "#f59e0b",
    accentVar: "var(--researcher-investment)",
    desc: "투자상품·포트폴리오",
  },
};

export function ResearcherCard({ name, state, response }: Props) {
  const meta = META[name];
  const Icon = meta.icon;

  return (
    <div
      className="glass-card rounded-2xl p-5 relative overflow-hidden fade-in min-h-[180px]"
      style={{ borderColor: state === "success" ? meta.accent : undefined }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: meta.accent, opacity: state === "success" ? 1 : 0.3 }}
      />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `${meta.accent}1a`,
              color: meta.accent,
            }}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-sm text-[color:var(--foreground)]">
              {meta.label}
            </div>
            <div className="text-xs text-[color:var(--muted-foreground)]">
              {meta.desc}
            </div>
          </div>
        </div>
        <StatusBadge state={state} accent={meta.accent} />
      </div>

      <div className="mt-4">
        {state === "idle" && (
          <div className="text-sm text-[color:var(--muted-foreground)]">
            대기 중
          </div>
        )}
        {state === "loading" && <LoadingSkeleton />}
        {state === "skipped" && (
          <div className="text-sm text-[color:var(--muted-foreground)]">
            이 질문에 활성화되지 않음
          </div>
        )}
        {state === "error" && (
          <div className="text-sm text-red-400">
            {response?.error ?? response?.summary ?? "분석 실패"}
          </div>
        )}
        {state === "success" && response && (
          <div className="space-y-2">
            <p className="text-sm text-[color:var(--foreground)] leading-relaxed">
              {response.summary}
            </p>
            <div className="flex items-center gap-3 pt-1 text-xs text-[color:var(--muted-foreground)]">
              <span>신뢰도 {(response.confidence * 100).toFixed(0)}%</span>
              <span>·</span>
              <span>{response.data_rows.length}개 데이터 행</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ state, accent }: { state: CardState; accent: string }) {
  if (state === "loading")
    return (
      <div className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        분석중
      </div>
    );
  if (state === "success")
    return (
      <div
        className="flex items-center gap-1.5 text-xs font-medium"
        style={{ color: accent }}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        완료
      </div>
    );
  if (state === "error")
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-400">
        <AlertCircle className="w-3.5 h-3.5" />
        오류
      </div>
    );
  if (state === "skipped")
    return (
      <div className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
        <MinusCircle className="w-3.5 h-3.5" />
        비활성
      </div>
    );
  return (
    <div className="text-xs text-[color:var(--muted-foreground)]">대기</div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 pulse-soft">
      <div className="h-3 rounded bg-[color:var(--secondary)] w-full" />
      <div className="h-3 rounded bg-[color:var(--secondary)] w-5/6" />
      <div className="h-3 rounded bg-[color:var(--secondary)] w-3/4" />
    </div>
  );
}
