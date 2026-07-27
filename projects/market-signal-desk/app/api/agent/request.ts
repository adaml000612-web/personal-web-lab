import { NextResponse } from "next/server";
import type { AgentContext } from "../../market-agent";
import {
  isSupportedModel,
  type CustomModelId,
  type CustomModelProvider,
} from "../../settings";

export const MAX_MESSAGE_LENGTH = 600;

const MAX_BODY_BYTES = 48_000;
const MAX_RATE_KEYS = 1_000;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;

type RateBucket = { count: number; resetAt: number };

export type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ModelSelection =
  | { provider: "default" }
  | {
      provider: CustomModelProvider;
      model: CustomModelId;
      apiKey: string;
    };

export type AgentRequestData = {
  message: string;
  context: AgentContext;
  history: HistoryMessage[];
  model: ModelSelection;
};

const rateBuckets = new Map<string, RateBucket>();
let nextRateSweepAt = 0;

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isShortText(value: unknown, maximum: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function isFiniteOrNull(value: unknown) {
  return value === null || typeof value === "number" && Number.isFinite(value);
}

function isValidQuote(value: unknown) {
  if (!isRecord(value)) return false;
  return isShortText(value.id, 80)
    && isShortText(value.symbol, 40)
    && isShortText(value.name, 80)
    && isShortText(value.market, 20)
    && isShortText(value.currency, 10)
    && (value.type === "stock" || value.type === "index")
    && typeof value.value === "number"
    && Number.isFinite(value.value)
    && isFiniteOrNull(value.previous)
    && isFiniteOrNull(value.changePct)
    && isFiniteOrNull(value.high)
    && isFiniteOrNull(value.low)
    && (typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
      || isShortText(value.updatedAt, 60));
}

function isValidSignal(value: unknown) {
  if (!isRecord(value)) return false;
  let safeUrl = false;
  try {
    safeUrl = new URL(String(value.url)).protocol === "https:";
  } catch {
    safeUrl = false;
  }
  return isShortText(value.id, 160)
    && isShortText(value.title, 400)
    && safeUrl
    && isShortText(value.source, 120)
    && isShortText(value.publishedAt, 60)
    && Number.isInteger(value.priority)
    && Number(value.priority) >= 1
    && Number(value.priority) <= 4
    && isShortText(value.reason, 240)
    && isShortText(value.actor, 100)
    && typeof value.official === "boolean"
    && typeof value.score === "number"
    && Number.isFinite(value.score)
    && Array.isArray(value.targets)
    && value.targets.length <= 20
    && value.targets.every((target) => isShortText(target, 80));
}

function isValidContext(value: unknown): value is AgentContext {
  if (!isRecord(value)) return false;
  return Array.isArray(value.quotes)
    && value.quotes.length <= 20
    && value.quotes.every(isValidQuote)
    && Array.isArray(value.signals)
    && value.signals.length <= 20
    && value.signals.every(isValidSignal)
    && (value.activeSymbol === undefined || isShortText(value.activeSymbol, 40))
    && (value.watchlistSymbols === undefined || Array.isArray(value.watchlistSymbols)
      && value.watchlistSymbols.length <= 20
      && value.watchlistSymbols.every((symbol) => isShortText(symbol, 40)));
}

function parseModelSelection(value: unknown): ModelSelection | null {
  if (!isRecord(value)) return null;
  if (value.provider === "default") return { provider: "default" };
  if (
    typeof value.provider !== "string"
    || typeof value.model !== "string"
    || !isSupportedModel(value.provider, value.model)
    || typeof value.apiKey !== "string"
    || value.apiKey.length < 20
    || value.apiKey.length > 512
  ) {
    return null;
  }
  return {
    provider: value.provider as CustomModelProvider,
    model: value.model,
    apiKey: value.apiKey,
  };
}

function parseHistory(value: unknown): HistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-6)
    .filter((item): item is HistoryMessage =>
      isRecord(item)
      && (item.role === "user" || item.role === "assistant")
      && typeof item.content === "string")
    .map(({ role, content }) => ({
      role,
      content: content.slice(0, MAX_MESSAGE_LENGTH),
    }));
}

function requestClientKey(request: Request) {
  // Sites runs on Cloudflare, where this header is set by the trusted edge.
  // Do not trust caller-supplied forwarding headers.
  return request.headers.get("cf-connecting-ip")?.slice(0, 64) || "local";
}

function allowRequest(key: string) {
  const now = Date.now();
  if (now >= nextRateSweepAt) {
    for (const [requestKey, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(requestKey);
    }
    nextRateSweepAt = now + RATE_WINDOW_MS;
  }

  const bucket = rateBuckets.get(key);
  if (!bucket) {
    if (rateBuckets.size >= MAX_RATE_KEYS) return false;
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

export function guardAgentRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return { response: json({ error: "请求来源无效" }, 403) };
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return { response: json({ error: "仅接受 JSON 请求" }, 415) };
  }
  const clientKey = requestClientKey(request);
  if (!allowRequest(clientKey)) {
    return {
      response: json({ error: "提问太快了，请稍后再试" }, 429, { "Retry-After": "60" }),
    };
  }
  return { clientKey };
}

export async function parseAgentRequest(request: Request) {
  let body: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return { response: json({ error: "问题内容过长" }, 413) };
    }
    const parsed = JSON.parse(rawBody);
    if (!isRecord(parsed)) throw new Error("body");
    body = parsed;
  } catch {
    return { response: json({ error: "请求格式无效" }, 400) };
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_LENGTH || !isValidContext(body.context)) {
    return { response: json({ error: "问题或市场数据格式无效" }, 400) };
  }

  const model = parseModelSelection(body.model ?? { provider: "default" });
  if (!model) {
    return { response: json({ error: "模型设置无效，请回到设置检查" }, 400) };
  }

  return {
    data: {
      message,
      context: body.context,
      history: parseHistory(body.history),
      model,
    } satisfies AgentRequestData,
  };
}
