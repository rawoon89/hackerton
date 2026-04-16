import type { CSVRow } from "../csv-loader";

export function ageBand(ageStr: string | undefined): string {
  const age = parseInt(ageStr ?? "", 10);
  if (isNaN(age)) return "unknown";
  if (age < 20) return "10대";
  if (age < 30) return "20대";
  if (age < 40) return "30대";
  if (age < 50) return "40대";
  if (age < 60) return "50대";
  if (age < 70) return "60대";
  return "70대이상";
}

export function childBucket(nStr: string | undefined): string {
  const n = parseInt(nStr ?? "", 10);
  if (isNaN(n)) return "unknown";
  if (n >= 2) return "2명이상";
  return `${n}명`;
}

export function countBy<T>(
  items: T[],
  keyFn: (item: T) => string,
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const it of items) {
    const k = keyFn(it);
    if (!k) continue;
    m[k] = (m[k] ?? 0) + 1;
  }
  return m;
}

export function topN(
  counts: Record<string, number>,
  n: number,
): Array<{ key: string; count: number }> {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

export function topNByMap(
  nested: Record<string, Record<string, number>>,
  n: number,
): Record<string, Array<{ key: string; count: number }>> {
  const out: Record<string, Array<{ key: string; count: number }>> = {};
  for (const [k, counts] of Object.entries(nested)) {
    out[k] = topN(counts, n);
  }
  return out;
}

export function numericField(row: CSVRow, field: string): number | null {
  const v = parseFloat(row[field]);
  return isNaN(v) ? null : v;
}

export function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function groupNumeric(
  rows: CSVRow[],
  groupFn: (r: CSVRow) => string,
  valueField: string,
): Record<string, number[]> {
  const groups: Record<string, number[]> = {};
  for (const r of rows) {
    const k = groupFn(r);
    if (!k) continue;
    const v = numericField(r, valueField);
    if (v === null) continue;
    (groups[k] ||= []).push(v);
  }
  return groups;
}
