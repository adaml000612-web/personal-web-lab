import { NextResponse } from "next/server";
import {
  nasdaqSources,
  secCompanies,
  watchedAliases,
  type Signal,
} from "../../market-config";

export const dynamic = "force-dynamic";

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function decodeEntities(value: string) {
  return value
    .replaceAll("<![CDATA[", "")
    .replaceAll("]]>", "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function parseRss(xml: string, meta: Omit<Signal, "id" | "title" | "url" | "publishedAt">) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 8).flatMap((match, index) => {
    const item = match[1];
    const title = decodeEntities(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const url = safeUrl(decodeEntities(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? ""));
    const published = decodeEntities(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ?? "");
    if (!title || !url) return [];
    const parsedDate = new Date(published);
    return [{
      id: `${meta.source}-${meta.actor}-${index}-${url}`,
      title,
      url,
      publishedAt: Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
      ...meta,
    }];
  });
}

function classifyWatchedHeadline(title: string) {
  const lower = title.toLowerCase();
  const direct = watchedAliases.find(({ values }) => values.some((value) => lower.includes(value)));
  if (direct) return { actor: direct.actor, priority: 1 as const, reason: "直接提及你的关注标的" };
  if (/(ai|chip|semiconductor|autonomous|electric vehicle|cloud|spaceflight|rocket)/i.test(title)) {
    return { actor: "产业链", priority: 2 as const, reason: "同板块或产业链信号" };
  }
  if (/(nasdaq|s&p 500|stock market|index|wall street)/i.test(title)) {
    return { actor: "指数", priority: 3 as const, reason: "关注标的所属指数信号" };
  }
  return null;
}

async function fetchNasdaq(source: (typeof nasdaqSources)[number]): Promise<Signal[]> {
  const { symbol } = source;
  const isPeer = "aliases" in source;
  const response = await fetch(`https://www.nasdaq.com/feed/rssoutbound?symbol=${symbol}`, {
    headers: { "User-Agent": "Mozilla/5.0 MarketSignalDesk/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`nasdaq ${response.status}`);
  const signals = parseRss(await response.text(), {
    source: "Nasdaq RSS",
    priority: isPeer ? 4 : 1,
    reason: isPeer ? "海外同类公司与映射市场" : "候选信号",
    actor: isPeer ? source.actor : symbol,
    official: false,
  });
  if (isPeer) {
    return signals.filter(({ title }) =>
      source.aliases.some((alias) => title.toLowerCase().includes(alias)));
  }
  return signals.flatMap((signal) => {
    const classification = classifyWatchedHeadline(signal.title);
    return classification ? [{ ...signal, ...classification }] : [];
  });
}

async function fetchTencentAnnouncements(): Promise<Signal[]> {
  const response = await fetch("https://www.tencent.com.cn/zh-cn/investors/announcements.html", {
    headers: { "User-Agent": "Mozilla/5.0 MarketSignalDesk/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`tencent ${response.status}`);
  const html = await response.text();
  return [...html.matchAll(/<a href="(https:\/\/static\.www\.tencent\.com\/uploads\/[^"]+\.pdf)"[^>]*class="ten_investor_link[^"]*"[\s\S]*?<span>(\d{4}\.\d{2}\.\d{2})<\/span>[\s\S]*?<label>([\s\S]*?)<\/label>/gi)]
    .slice(0, 10)
    .map((match, index) => ({
      id: `tencent-official-${index}-${match[1]}`,
      title: `腾讯：${decodeEntities(match[3])}`,
      url: match[1],
      source: "腾讯投资者关系",
      publishedAt: new Date(`${match[2].replaceAll(".", "-")}T12:00:00+08:00`).toISOString(),
      priority: 1 as const,
      reason: "公司官方投资者公告",
      actor: "腾讯",
      official: true,
    }));
}

async function fetchInnolightAnnouncements(): Promise<Signal[]> {
  const params = new URLSearchParams({
    sr: "-1",
    page_size: "10",
    page_index: "1",
    ann_type: "A",
    client_source: "web",
    stock_list: "300308",
  });
  const response = await fetch(`https://np-anotice-stock.eastmoney.com/api/security/ann?${params.toString()}`, {
    headers: { "User-Agent": "Mozilla/5.0 MarketSignalDesk/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`eastmoney ${response.status}`);
  const payload = await response.json();
  return (payload?.data?.list ?? []).slice(0, 10).flatMap((item: Record<string, unknown>) => {
    const title = typeof item.title === "string" ? item.title : "";
    const code = typeof item.art_code === "string" ? item.art_code : "";
    const dateValue = typeof item.notice_date === "string" ? item.notice_date : "";
    const url = safeUrl(`https://data.eastmoney.com/notices/detail/300308/${code}.html`);
    if (!title || !code || !url) return [];
    return [{
      id: `innolight-${code}`,
      title,
      url,
      source: "东方财富公告索引",
      publishedAt: dateValue ? new Date(dateValue).toISOString() : new Date().toISOString(),
      priority: 1 as const,
      reason: "中际旭创公司公告",
      actor: "中际旭创",
      official: false,
    }];
  });
}

async function fetchSecFilings(): Promise<Signal[]> {
  const results = await Promise.allSettled(secCompanies.map(async ({ actor, cik }) => {
    const response = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
      headers: { "User-Agent": "MarketSignalDesk contact@example.com", Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`sec ${response.status}`);
    const payload = await response.json();
    const recent = payload?.filings?.recent;
    if (!recent?.accessionNumber) return [];
    const cutoff = Date.now() - 120 * 24 * 60 * 60 * 1000;
    return recent.accessionNumber.flatMap((accession: string, index: number) => {
      const filingDate = recent.filingDate?.[index];
      const form = recent.form?.[index];
      const document = recent.primaryDocument?.[index];
      if (!filingDate || !document || !["8-K", "10-Q", "10-K", "4", "DEF 14A"].includes(form) || new Date(filingDate).getTime() < cutoff) return [];
      const cikPlain = String(Number(cik));
      const accessionPlain = accession.replaceAll("-", "");
      return [{
        id: `sec-${accession}`,
        title: `${actor} 向 SEC 提交 ${form} 文件`,
        url: `https://www.sec.gov/Archives/edgar/data/${cikPlain}/${accessionPlain}/${document}`,
        source: "SEC EDGAR",
        publishedAt: new Date(`${filingDate}T12:00:00Z`).toISOString(),
        priority: 1 as const,
        reason: "公司官方监管披露",
        actor,
        official: true,
      }];
    }).slice(0, 6);
  }));
  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

export async function GET() {
  const sources = await Promise.allSettled([
    ...nasdaqSources.map(fetchNasdaq),
    fetchTencentAnnouncements(),
    fetchInnolightAnnouncements(),
    fetchSecFilings(),
  ]);

  const seen = new Set<string>();
  const signals = sources
    .flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .filter((signal) => {
      const key = `${signal.url}|${signal.title.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.priority !== b.priority
      ? a.priority - b.priority
      : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 80);

  return NextResponse.json(
    {
      signals,
      fetchedAt: new Date().toISOString(),
      status: {
        workingSources: sources.filter((result) => result.status === "fulfilled").length,
        totalSources: sources.length,
      },
    },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } },
  );
}
