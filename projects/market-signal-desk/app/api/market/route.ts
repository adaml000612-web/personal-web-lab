import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const instruments = [
  { id: "nvda", query: "usNVDA", symbol: "NVDA", name: "英伟达", market: "美股", type: "stock", currency: "USD" },
  { id: "tsla", query: "usTSLA", symbol: "TSLA", name: "特斯拉", market: "美股", type: "stock", currency: "USD" },
  { id: "googl", query: "usGOOGL", symbol: "GOOGL", name: "谷歌", market: "美股", type: "stock", currency: "USD" },
  { id: "tencent", query: "hk00700", symbol: "0700.HK", name: "腾讯控股", market: "港股", type: "stock", currency: "HKD" },
  { id: "innolight", query: "sz300308", symbol: "300308.SZ", name: "中际旭创", market: "A股", type: "stock", currency: "CNY" },
  { id: "nasdaq", query: "usIXIC", symbol: "^IXIC", name: "纳斯达克", market: "美国", type: "index", currency: "USD" },
  { id: "sp500", query: "usINX", symbol: "^GSPC", name: "标普 500", market: "美国", type: "index", currency: "USD" },
  { id: "sse", query: "sh000001", symbol: "000001.SS", name: "上证指数", market: "中国", type: "index", currency: "CNY" },
] as const;

function timestamp(value: string) {
  const normalized = value.includes("/")
    ? value.replaceAll("/", "-")
    : /^\d{14}$/.test(value)
      ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}`
      : value;
  const parsed = new Date(normalized.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? Math.floor(Date.now() / 1000) : Math.floor(parsed.getTime() / 1000);
}

export async function GET() {
  try {
    const response = await fetch(`https://qt.gtimg.cn/q=${instruments.map(({ query }) => query).join(",")}`, {
      headers: {
        Referer: "https://finance.qq.com/",
        "User-Agent": "Mozilla/5.0 MarketSignalDesk/1.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`quote ${response.status}`);

    const text = new TextDecoder("gbk").decode(await response.arrayBuffer());
    const records = new Map(
      text
        .split(";")
        .filter(Boolean)
        .flatMap((line) => {
          const cleaned = line.trim();
          const key = cleaned.slice(2, cleaned.indexOf("=")).trim();
          const quoted = cleaned.split('"')[1];
          return quoted ? [[key, quoted.split("~")] as const] : [];
        }),
    );

    const items = instruments.flatMap((instrument) => {
      const fields = records.get(instrument.query);
      if (!fields) return [];
      const value = Number(fields[3]);
      const previous = Number(fields[4]);
      const changePct = Number(fields[32]);
      if (!Number.isFinite(value)) return [];
      return [{
        ...instrument,
        value,
        previous: Number.isFinite(previous) ? previous : null,
        changePct: Number.isFinite(changePct)
          ? changePct
          : Number.isFinite(previous) && previous !== 0
            ? ((value - previous) / previous) * 100
            : null,
        exchange: "Tencent Finance",
        updatedAt: timestamp(fields[30] ?? ""),
        delayed: true,
      }];
    });

    return NextResponse.json(
      {
        items,
        unavailable: instruments.filter(({ id }) => !items.some((item) => item.id === id)).map(({ id }) => id),
        fetchedAt: new Date().toISOString(),
        provider: "腾讯财经延迟行情",
      },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json({
      items: [],
      unavailable: instruments.map(({ id }) => id),
      fetchedAt: new Date().toISOString(),
      provider: "腾讯财经延迟行情",
    });
  }
}
