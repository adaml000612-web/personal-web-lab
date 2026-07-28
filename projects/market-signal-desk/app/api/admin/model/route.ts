import { requireAdminApi } from "../../../admin-guard";
import {
  clearDefaultAiKey,
  readDefaultAiConfig,
  saveDefaultAiConfig,
} from "../../../../server/admin-store";

const supportedModels = new Set(["deepseek-v4-flash", "deepseek-v4-pro"]);

export const dynamic = "force-dynamic";

async function testDeepSeek(apiKey: string, model: string) {
  const response = await fetch("https://api.deepseek.com/models", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("API Key 无效");
    if (response.status === 402) throw new Error("DeepSeek 账户余额不足");
    throw new Error("DeepSeek 暂时无法连接");
  }
  const data = await response.json() as { data?: Array<{ id?: string }> };
  if (!data.data?.some(({ id }) => id === model)) {
    throw new Error("当前账户暂时不能使用所选模型");
  }
}

export async function POST(request: Request) {
  const guarded = requireAdminApi(request, true);
  if ("response" in guarded) return guarded.response;

  let body: { action?: string; enabled?: boolean; model?: string; apiKey?: string };
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 4_096) throw new Error("large");
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "请求格式无效" }, { status: 400 });
  }

  if (body.action === "clear") {
    const model = await clearDefaultAiKey();
    return Response.json({ model, message: "默认 API Key 已清除" });
  }
  if (body.action !== "save" || typeof body.enabled !== "boolean" || !supportedModels.has(body.model ?? "")) {
    return Response.json({ error: "模型设置无效" }, { status: 400 });
  }

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (apiKey && (apiKey.length < 20 || apiKey.length > 512)) {
    return Response.json({ error: "API Key 长度不正确" }, { status: 400 });
  }

  try {
    const current = await readDefaultAiConfig();
    const effectiveKey = apiKey || current?.apiKey || "";
    if (body.enabled && !effectiveKey) {
      return Response.json({ error: "请先填写 DeepSeek API Key" }, { status: 400 });
    }
    if (effectiveKey) await testDeepSeek(effectiveKey, body.model!);
    const model = await saveDefaultAiConfig({
      enabled: body.enabled,
      model: body.model as "deepseek-v4-flash" | "deepseek-v4-pro",
      apiKey: apiKey || undefined,
    });
    return Response.json({
      model,
      message: effectiveKey ? "连接测试通过，默认模型设置已保存" : "模型设置已保存",
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "保存失败，请稍后再试",
    }, { status: 502 });
  }
}
