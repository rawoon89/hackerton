"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint, ChartType } from "@/lib/types";

interface Props {
  type: ChartType;
  title: string;
  data: ChartPoint[];
}

const PALETTE = [
  "#ff6b00",
  "#ff8a3d",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#eab308",
  "#ec4899",
];

const AXIS_STYLE = { fill: "#6b7484", fontSize: 11 };
const GRID_COLOR = "#e4e7ec";
const CURSOR_FILL = "#f1f3f6";

function TooltipStyle(): React.CSSProperties {
  return {
    background: "#ffffff",
    border: "1px solid #e4e7ec",
    borderRadius: 8,
    color: "#0f1419",
    fontSize: 12,
    boxShadow: "0 6px 24px rgba(15, 20, 25, 0.08)",
  };
}

export function AutoChart({ type, title, data }: Props) {
  if (type === "none" || data.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-5 fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
          {title || "분석 차트"}
        </h3>
        <span className="text-xs text-[color:var(--muted-foreground)] uppercase tracking-wider">
          {type}
        </span>
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(type, data)}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function renderChart(type: ChartType, data: ChartPoint[]) {
  if (type === "bar") {
    return (
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis
          dataKey="label"
          tick={AXIS_STYLE}
          interval={0}
          angle={data.length > 6 ? -20 : 0}
          textAnchor={data.length > 6 ? "end" : "middle"}
          height={data.length > 6 ? 60 : 30}
        />
        <YAxis tick={AXIS_STYLE} />
        <Tooltip contentStyle={TooltipStyle()} cursor={{ fill: CURSOR_FILL }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    );
  }

  if (type === "line") {
    return (
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis dataKey="label" tick={AXIS_STYLE} />
        <YAxis tick={AXIS_STYLE} />
        <Tooltip contentStyle={TooltipStyle()} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#ff6b00"
          strokeWidth={2.5}
          dot={{ fill: "#ff6b00", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    );
  }

  return (
    <PieChart>
      <Tooltip contentStyle={TooltipStyle()} />
      <Pie
        data={data}
        dataKey="value"
        nameKey="label"
        outerRadius={100}
        innerRadius={50}
        paddingAngle={2}
        label
        labelLine={false}
      >
        {data.map((_, i) => (
          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
        ))}
      </Pie>
    </PieChart>
  );
}
