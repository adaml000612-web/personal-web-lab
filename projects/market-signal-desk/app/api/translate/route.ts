import { NextResponse } from "next/server";
import { isValidTranslationText, normalizeTranslationText } from "../../signal-presentation";

export const dynamic = "force-dynamic";

const translations = new Map<string, string>();
const requests = new Map<string, number[]>();

function withinLimit(request: Request) {
  const client = request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const now = Date.now();
  const recent = (requests.get(client) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 20) return false;
  requests.set(client, [...recent, now]);
  return true;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const value = (body as { text?: unknown })?.text;
  if (!isValidTranslationText(value)) {
    return NextResponse.json({ error: "只支持 500 字节以内的英文标题" }, { status: 400 });
  }

  const text = normalizeTranslationText(value as string);
  const cached = translations.get(text);
  if (cached) return NextResponse.json({ translation: cached });
  if (!withinLimit(request)) {
    return NextResponse.json({ error: "翻译请求过于频繁，请稍后重试" }, { status: 429 });
  }

  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", "en|zh-CN");
    const response = await fetch(url, {
      headers: { "User-Agent": "MarketSignalDesk/1.4" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error();
    const data = await response.json();
    const translation = data?.responseData?.translatedText;
    if (typeof translation !== "string" ||
      !translation.trim() ||
      /^MYMEMORY WARNING/i.test(translation)) throw new Error();

    const normalized = normalizeTranslationText(translation);
    if (translations.size >= 200) translations.delete(translations.keys().next().value as string);
    translations.set(text, normalized);
    return NextResponse.json({ translation: normalized });
  } catch {
    return NextResponse.json({ error: "翻译服务暂时不可用" }, { status: 502 });
  }
}
