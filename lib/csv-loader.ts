import fs from "fs";
import path from "path";
import Papa from "papaparse";

export type CSVRow = Record<string, string>;

const DATA_DIR = path.join(process.cwd(), "data");

export function loadCSV(filename: string): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const filePath = path.join(DATA_DIR, filename);
    const file = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data),
      error: (err: Error) => reject(err),
    });
  });
}

export function filterRows(
  data: CSVRow[],
  column: string,
  value: string | number,
): CSVRow[] {
  const target = String(value);
  return data.filter((row) => row[column] === target);
}

export function groupBy(
  data: CSVRow[],
  column: string,
): Record<string, CSVRow[]> {
  return data.reduce<Record<string, CSVRow[]>>((acc, row) => {
    const key = row[column] ?? "";
    (acc[key] ||= []).push(row);
    return acc;
  }, {});
}
