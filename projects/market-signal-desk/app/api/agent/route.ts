import { buildFallbackAgentAnswer } from "../../market-agent";
import type { CustomModelProvider } from "../../settings";
import { generateModelAnswer } from "./providers";
import {
  guardAgentRequest,
  json,
  parseAgentRequest,
  type ModelSelection,
} from "./request";

export const dynamic = "force-dynamic";

function resolveProvider(model: ModelSelection) {
  if (model.provider !== "default") {
    return {
      provider: model.provider,
      apiKey: model.apiKey,
      model: model.model,
    };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    provider: "openai" as CustomModelProvider,
    apiKey,
    model: process.env.OPENAI_AGENT_MODEL || "gpt-5.6-luna",
  };
}

export async function POST(request: Request) {
  const guarded = guardAgentRequest(request);
  if ("response" in guarded) return guarded.response;

  const parsed = await parseAgentRequest(request);
  if ("response" in parsed) return parsed.response;

  const { message, context, history, model } = parsed.data;
  const fallback = buildFallbackAgentAnswer(message, context);
  const provider = resolveProvider(model);
  if (!provider) return json({ ...fallback, engine: "data" });

  const marketData = JSON.stringify({
    quotes: context.quotes,
    signals: context.signals,
    activeSymbol: context.activeSymbol,
    watchlistSymbols: context.watchlistSymbols,
    verifiedFallback: fallback.answer,
  });
  const prompt = `用户问题：${message}\n\n<market_data>${marketData}</market_data>`;

  try {
    const answer = await generateModelAnswer({
      ...provider,
      history,
      prompt,
      clientKey: guarded.clientKey,
    });
    if (!answer) throw new Error("empty");
    return json({ ...fallback, answer, engine: "ai" });
  } catch {
    if (model.provider !== "default") {
      return json({ error: "自备模型未能连接，请检查 API Key、模型名称和账户余额" }, 502);
    }
    return json({ ...fallback, engine: "data" });
  }
}
