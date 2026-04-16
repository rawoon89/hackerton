import {
  GenerativeModel,
  GoogleGenerativeAI,
} from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const MODEL_CHAIN = [
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
] as const;

const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);
const DAILY_MARK_MS = 6 * 60 * 60 * 1000;
const MINUTE_MARK_MS = 60 * 1000;
const PRIMARY_RESET_MS = 5 * 60 * 1000;

const genAI = new GoogleGenerativeAI(apiKey);
const modelCache = new Map<string, GenerativeModel>();
const deadUntil = new Map<string, number>();

let lastWorkingIndex = 0;
let lastResetAt = Date.now();
let lastUsedModel: string = MODEL_CHAIN[0];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function debugLog(msg: string): void {
  if (process.env.DEBUG) {
    process.stderr.write(`[gemini] ${msg}\n`);
  }
}

function getModel(name: string): GenerativeModel {
  let m = modelCache.get(name);
  if (!m) {
    m = genAI.getGenerativeModel({ model: name });
    modelCache.set(name, m);
  }
  return m;
}

interface GeminiErrorLike {
  status?: number;
  message?: string;
  errorDetails?: Array<{
    "@type"?: string;
    violations?: Array<{ quotaId?: string }>;
    retryDelay?: string;
  }>;
}

function classify429(
  err: GeminiErrorLike,
): { kind: "daily" | "minute"; retryDelayMs: number } {
  const details = err.errorDetails ?? [];
  let kind: "daily" | "minute" = "minute";
  let retryDelaySec = 30;

  for (const d of details) {
    const t = d["@type"] ?? "";
    if (t.includes("QuotaFailure") && d.violations) {
      for (const v of d.violations) {
        if (v.quotaId?.includes("PerDay")) {
          kind = "daily";
        }
      }
    }
    if (t.includes("RetryInfo") && d.retryDelay) {
      const m = /^(\d+(?:\.\d+)?)s$/.exec(d.retryDelay);
      if (m) retryDelaySec = parseFloat(m[1]);
    }
  }

  return { kind, retryDelayMs: Math.ceil(retryDelaySec * 1000) };
}

async function tryModel(
  name: string,
  prompt: string,
): Promise<
  | { ok: true; text: string }
  | { ok: false; cascade: boolean; err: unknown }
> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await getModel(name).generateContent(prompt);
      return { ok: true, text: result.response.text() };
    } catch (err) {
      const status = (err as GeminiErrorLike).status;

      if (status === 429) {
        const info = classify429(err as GeminiErrorLike);
        if (info.kind === "daily") {
          deadUntil.set(name, Date.now() + DAILY_MARK_MS);
          debugLog(`${name} daily quota exhausted → blacklist 6h`);
          return { ok: false, cascade: true, err };
        }
        if (attempt < 2) {
          debugLog(
            `${name} minute quota → wait ${info.retryDelayMs}ms (attempt ${attempt + 1})`,
          );
          await sleep(Math.min(info.retryDelayMs, 20_000));
          continue;
        }
        deadUntil.set(name, Date.now() + MINUTE_MARK_MS);
        return { ok: false, cascade: true, err };
      }

      if (status && TRANSIENT_STATUSES.has(status)) {
        if (attempt < 2) {
          const delay = 2000 * Math.pow(2, attempt);
          debugLog(
            `${name} ${status} → retry in ${delay}ms (attempt ${attempt + 1})`,
          );
          await sleep(delay);
          continue;
        }
        return { ok: false, cascade: true, err };
      }

      return { ok: false, cascade: false, err };
    }
  }
  return {
    ok: false,
    cascade: true,
    err: new Error(`${name} exhausted retries`),
  };
}

export async function callGemini(prompt: string): Promise<string> {
  if (Date.now() - lastResetAt > PRIMARY_RESET_MS) {
    lastWorkingIndex = 0;
    lastResetAt = Date.now();
  }

  let lastErr: unknown;
  for (let offset = 0; offset < MODEL_CHAIN.length; offset++) {
    const idx = (lastWorkingIndex + offset) % MODEL_CHAIN.length;
    const name = MODEL_CHAIN[idx];

    const dead = deadUntil.get(name);
    if (dead && dead > Date.now()) {
      debugLog(`skip ${name} (blacklisted for ${dead - Date.now()}ms)`);
      continue;
    }

    const result = await tryModel(name, prompt);

    if (result.ok) {
      if (idx !== lastWorkingIndex) {
        debugLog(
          `${MODEL_CHAIN[lastWorkingIndex]} failed → cascading to ${name}`,
        );
      }
      lastWorkingIndex = idx;
      lastUsedModel = name;
      return result.text;
    }

    lastErr = result.err;
    if (!result.cascade) throw result.err;
  }

  throw lastErr ?? new Error("All models in MODEL_CHAIN failed");
}

export function getLastUsedModel(): string {
  return lastUsedModel;
}

export function getModelChainStatus(): Array<{
  model: string;
  deadForMs: number;
}> {
  const now = Date.now();
  return MODEL_CHAIN.map((m) => ({
    model: m,
    deadForMs: Math.max(0, (deadUntil.get(m) ?? 0) - now),
  }));
}

export function parseJSONResponse<T = unknown>(text: string): T {
  let cleaned = text.trim();

  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const firstBrace = cleaned.search(/[\[{]/);
  if (firstBrace > 0) {
    cleaned = cleaned.slice(firstBrace);
  }

  return JSON.parse(cleaned) as T;
}

export async function callGeminiJSON<T = unknown>(prompt: string): Promise<T> {
  const text = await callGemini(prompt);
  return parseJSONResponse<T>(text);
}
