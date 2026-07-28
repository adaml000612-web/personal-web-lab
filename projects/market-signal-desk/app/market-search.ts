import type { SearchInstrument } from "./market-symbol";

const maxSearchResponseLength = 64_000;
const maxSearchResults = 6;

export function isSafeCompanyQuery(value: string) {
  const query = value.trim();
  return query.length >= 1
    && query.length <= 60
    && /^[\p{L}\p{N}\s·&+.'’（）()\-]+$/u.test(query);
}

function decodeTencentHint(value: string) {
  const match = /^v_hint="([\s\S]*)";?\s*$/.exec(value.trim());
  if (!match || match[1] === "N") return "";
  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return "";
  }
}

export function parseTencentStockSearch(value: string): SearchInstrument[] {
  const decoded = decodeTencentHint(value);
  if (!decoded) return [];

  const results = new Map<string, SearchInstrument>();
  for (const record of decoded.split("^")) {
    const [rawExchange, rawCode, name, , category] = record.split("~");
    const exchange = rawExchange?.toLowerCase();
    if (!["sh", "sz", "hk", "us"].includes(exchange) || !rawCode || !name || !category?.startsWith("GP")) continue;

    const code = exchange === "us"
      ? rawCode.split(".")[0].toUpperCase()
      : exchange === "hk"
        ? rawCode.padStart(5, "0")
        : rawCode;
    if (
      (exchange === "us" && !/^[A-Z]{1,6}$/.test(code))
      || (exchange === "hk" && !/^\d{5}$/.test(code))
      || ((exchange === "sh" || exchange === "sz") && !/^\d{6}$/.test(code))
    ) continue;

    const query = `${exchange}${code}`;
    const market = exchange === "us" ? "美股" : exchange === "hk" ? "港股" : "A股";
    results.set(query, {
      id: `search-${query.toLowerCase()}`,
      query,
      symbol: exchange === "hk" ? `${code}.HK` : exchange === "sh" ? `${code}.SS` : exchange === "sz" ? `${code}.SZ` : code,
      name,
      market,
      type: "stock",
      currency: exchange === "us" ? "USD" : exchange === "hk" ? "HKD" : "CNY",
    });
    if (results.size >= maxSearchResults) break;
  }
  return [...results.values()];
}

export async function searchCompanyInstruments(value: string) {
  const query = value.trim();
  if (!isSafeCompanyQuery(query)) return [];

  try {
    const url = new URL("https://smartbox.gtimg.cn/s3/");
    url.searchParams.set("q", query);
    url.searchParams.set("t", "all");
    const response = await fetch(url, {
      headers: {
        Referer: "https://finance.qq.com/",
        "User-Agent": "Mozilla/5.0 MarketSignalDesk/1.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return [];
    const text = await response.text();
    if (text.length > maxSearchResponseLength) return [];
    return parseTencentStockSearch(text);
  } catch {
    return [];
  }
}
