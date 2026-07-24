import { NextResponse } from "next/server";
import { addMovingAverages, aggregatePoints, parseNasdaqDate, type KlinePeriod } from "../../kline";
import { parseStockSymbol, type SearchInstrument } from "../../market-symbol";

export const dynamic = "force-dynamic";

const periods = new Set<KlinePeriod>(["day", "week", "month"]);

function validPoint(values: unknown[]) {
  return values.every((value) => Number.isFinite(Number(value)));
}

function number(value: string) {
  return Number(value.replace(/[$,]/g, ""));
}

async function fetchNasdaq(instrument: SearchInstrument, period: KlinePeriod) {
  const days = { day: 180, week: 730, month: 1825 }[period];
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  const response = await fetch(
    `https://api.nasdaq.com/api/quote/${instrument.symbol}/historical?assetclass=stocks&fromdate=${from.toISOString().slice(0, 10)}&limit=1500`,
    {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error(`history ${response.status}`);
  const rows = (await response.json())?.data?.tradesTable?.rows ?? [];
  const daily = rows.flatMap((row: Record<string, string>) => {
    const values = [row.open, row.close, row.high, row.low, row.volume].map(number);
    if (!validPoint(values)) return [];
    return [{
      date: parseNasdaqDate(row.date),
      open: values[0],
      close: values[1],
      high: values[2],
      low: values[3],
      volume: values[4],
    }];
  }).reverse();
  return (period === "day" ? daily : aggregatePoints(daily, period)).slice(-80);
}

async function fetchTencent(instrument: SearchInstrument, period: KlinePeriod) {
  const response = await fetch(
    `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${instrument.query},${period},,,80,qfq`,
    {
      headers: { "User-Agent": "Mozilla/5.0 MarketSignalDesk/1.3", Referer: "https://finance.qq.com/" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error(`history ${response.status}`);
  const data = (await response.json())?.data?.[instrument.query];
  const rows = data?.[`qfq${period}`] ?? data?.[period] ?? [];
  return rows.flatMap((row: unknown[]) => {
    const values = row.slice(1, 6);
    if (typeof row[0] !== "string" || !validPoint(values)) return [];
    return [{
      date: row[0],
      open: Number(values[0]),
      close: Number(values[1]),
      high: Number(values[2]),
      low: Number(values[3]),
      volume: Number(values[4]),
    }];
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const instrument = parseStockSymbol(url.searchParams.get("symbol") ?? "");
  const period = url.searchParams.get("period") as KlinePeriod;
  if (!instrument || !periods.has(period)) {
    return NextResponse.json({ points: [], error: "股票代码或 K 线周期无效" }, { status: 400 });
  }

  try {
    const rawPoints = instrument.market === "美股"
      ? await fetchNasdaq(instrument, period)
      : await fetchTencent(instrument, period);
    if (rawPoints.length < 2) throw new Error("history unavailable");
    return NextResponse.json(
      { symbol: instrument.symbol, period, points: addMovingAverages(rawPoints), delayed: true },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } },
    );
  } catch {
    return NextResponse.json(
      { symbol: instrument.symbol, period, points: [], error: "暂时没有取得这只股票的历史行情" },
      { status: 502 },
    );
  }
}
