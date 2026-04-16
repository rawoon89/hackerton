"use client";

import { FileText } from "lucide-react";
import type { Citation } from "@/lib/types";

interface Props {
  citations: Citation[];
}

export function CitationTable({ citations }: Props) {
  if (!citations || citations.length === 0) return null;

  const grouped = citations.reduce<Record<string, Citation[]>>((acc, c) => {
    (acc[c.source] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div className="glass-card rounded-2xl p-5 fade-in">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-[color:var(--hanwha-orange)]" />
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
          인용 데이터
        </h3>
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {citations.length}건
        </span>
      </div>
      <div className="space-y-4">
        {Object.entries(grouped).map(([source, rows]) => (
          <SourceTable key={source} source={source} rows={rows} />
        ))}
      </div>
    </div>
  );
}

function SourceTable({ source, rows }: { source: string; rows: Citation[] }) {
  const columns = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r.row ?? {}))),
  );

  return (
    <div>
      <div className="text-xs text-[color:var(--hanwha-orange-soft)] font-mono mb-2">
        {source}
      </div>
      <div className="overflow-x-auto rounded-lg border border-[color:var(--border)]">
        <table className="w-full text-xs">
          <thead className="bg-[color:var(--secondary)]">
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  className="text-left px-3 py-2 font-medium text-[color:var(--muted-foreground)] whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className="border-t border-[color:var(--border)] hover:bg-[color:var(--secondary)]/50"
              >
                {columns.map((c) => (
                  <td
                    key={c}
                    className="px-3 py-2 text-[color:var(--foreground)] whitespace-nowrap"
                  >
                    {formatCell(r.row?.[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
