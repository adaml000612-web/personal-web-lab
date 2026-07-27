import { NextResponse } from "next/server";
import {
  nasdaqSources,
  secCompanies,
  watchlist,
  type RawSignal,
} from "../../market-config";
import {
  decodeFeedText,
  keepRecentSignals,
  parseNewsFeed,
  safeNewsUrl,
  type FeedFallback,
  type FeedMeta,
} from "../../news-collector";
import { rankSignals } from "../../ranking";

const SOURCE_TIMEOUT_MS = 5500;
const OPTIONAL_SOURCE_TIMEOUT_MS = 2500;
const NEWS_CACHE_MS = 180_000;
const MAX_RESPONSE_BYTES = 2_000_000;

type NewsPayload = {
  signals: ReturnType<typeof rankSignals>;
  fetchedAt: string;
  status: {
    workingSources: number;
    totalSources: number;
    recent24h: number;
    coverage: Record<"p1" | "p2" | "p3" | "p4", number>;
    failedSources: string[];
  };
};

let cachedNews: { expiresAt: number; payload: NewsPayload } | null = null;

export const dynamic = "force-dynamic";

async function fetchFeed(url: string, meta: FeedMeta, days = 7) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml",
      "User-Agent": "Mozilla/5.0 MarketSignalDesk/2.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(meta.timeoutMs ?? SOURCE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`feed ${response.status}`);
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_RESPONSE_BYTES) throw new Error("feed too large");
  const xml = await response.text();
  if (new TextEncoder().encode(xml).length > MAX_RESPONSE_BYTES) throw new Error("feed too large");
  return keepRecentSignals(parseNewsFeed(xml, meta), days);
}

async function fetchNasdaq(source: (typeof nasdaqSources)[number]): Promise<RawSignal[]> {
  const { symbol } = source;
  const isPeer = "aliases" in source;
  const watched = watchlist.find((item) => item.symbol === symbol);
  const fallback: FeedFallback | undefined = isPeer
    ? {
        priority: 4,
        reason: "海外同类公司与映射市场",
        actor: source.actor,
        targets: [...source.targets],
      }
    : watched
      ? {
          priority: 1,
          reason: "关注公司相关新闻",
          actor: watched.name,
          targets: [watched.id],
        }
      : undefined;
  return fetchFeed(`https://www.nasdaq.com/feed/rssoutbound?symbol=${encodeURIComponent(symbol)}`, {
    source: "Nasdaq RSS",
    official: false,
    fallback,
    maxItems: 16,
  }, 10);
}

const allTargets = watchlist.map(({ id }) => id);
const nasdaqCoverageFeeds: Array<{ symbol: string; fallback: FeedFallback }> = [
  {
    symbol: "QQQ",
    fallback: { priority: 3, reason: "纳斯达克市场与指数信号", actor: "纳斯达克", targets: allTargets },
  },
  {
    symbol: "SPY",
    fallback: { priority: 3, reason: "标普 500 市场与指数信号", actor: "标普500", targets: allTargets },
  },
  {
    symbol: "FXI",
    fallback: { priority: 3, reason: "中国与港股市场指数信号", actor: "中概与港股指数", targets: allTargets },
  },
  {
    symbol: "SMH",
    fallback: {
      priority: 2,
      reason: "半导体产业链与板块信号",
      actor: "半导体产业链",
      targets: ["nvda", "googl", "innolight"],
    },
  },
  {
    symbol: "SOXX",
    fallback: {
      priority: 2,
      reason: "芯片产业链与板块信号",
      actor: "芯片产业链",
      targets: ["nvda", "googl", "innolight"],
    },
  },
];

function fetchNasdaqCoverage({ symbol, fallback }: (typeof nasdaqCoverageFeeds)[number]) {
  return fetchFeed(`https://www.nasdaq.com/feed/rssoutbound?symbol=${symbol}`, {
    source: "Nasdaq 主题 RSS",
    fallback,
    preferFallback: true,
    maxItems: 14,
  }, 7);
}

const publicQueries: Array<{
  provider: "Google News" | "Bing News";
  query: string;
  locale?: "zh";
  fallback?: FeedFallback;
}> = [
  { provider: "Google News", query: '"NVIDIA" OR "Tesla" OR "Alphabet" OR "Google" OR "SpaceX" when:3d' },
  { provider: "Google News", query: '"腾讯" OR "中际旭创" OR "Tencent" OR "Innolight" when:5d', locale: "zh" },
  {
    provider: "Google News",
    query: '"AI chips" OR semiconductor OR datacenter OR "electric vehicle" OR rocket OR satellite when:3d',
    fallback: { priority: 2, reason: "同板块或产业链信号", actor: "产业链", targets: allTargets },
  },
  {
    provider: "Google News",
    query: 'Nasdaq OR "S&P 500" OR "Shanghai Composite" OR "Hang Seng" when:3d',
    fallback: { priority: 3, reason: "关注标的所属市场指数信号", actor: "指数", targets: allTargets },
  },
  {
    provider: "Google News",
    query: 'AMD OR Broadcom OR TSMC OR "Rocket Lab" OR Meta OR Alibaba OR "SK hynix" OR Samsung when:3d',
    fallback: { priority: 4, reason: "海外同类公司与映射市场", actor: "海外市场", targets: allTargets },
  },
  {
    provider: "Bing News",
    query: "Nasdaq S&P 500 stock market",
    fallback: { priority: 3, reason: "关注标的所属市场指数信号", actor: "指数", targets: allTargets },
  },
  {
    provider: "Bing News",
    query: "AI semiconductor data center electric vehicle market",
    fallback: { priority: 2, reason: "同板块或产业链信号", actor: "产业链", targets: allTargets },
  },
];

function publicFeedUrl({ provider, query, locale }: (typeof publicQueries)[number]) {
  if (provider === "Bing News") {
    const url = new URL("https://www.bing.com/news/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "rss");
    return url.toString();
  }
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", locale === "zh" ? "zh-CN" : "en-US");
  url.searchParams.set("gl", locale === "zh" ? "CN" : "US");
  url.searchParams.set("ceid", locale === "zh" ? "CN:zh-Hans" : "US:en");
  return url.toString();
}

function fetchPublicNews(query: (typeof publicQueries)[number]) {
  return fetchFeed(publicFeedUrl(query), {
    source: query.provider,
    fallback: query.fallback,
    preferFallback: Boolean(query.fallback),
    maxItems: query.provider === "Google News" ? 36 : 20,
    timeoutMs: OPTIONAL_SOURCE_TIMEOUT_MS,
  }, query.locale === "zh" ? 5 : 3);
}

async function fetchTencentAnnouncements(): Promise<RawSignal[]> {
  const response = await fetch("https://www.tencent.com.cn/zh-cn/investors/announcements.html", {
    headers: { "User-Agent": "Mozilla/5.0 MarketSignalDesk/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(OPTIONAL_SOURCE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`tencent ${response.status}`);
  const html = await response.text();
  return [...html.matchAll(/<a href="(https:\/\/static\.www\.tencent\.com\/uploads\/[^"]+\.pdf)"[^>]*class="ten_investor_link[^"]*"[\s\S]*?<span>(\d{4}\.\d{2}\.\d{2})<\/span>[\s\S]*?<label>([\s\S]*?)<\/label>/gi)]
    .slice(0, 10)
    .map((match, index) => ({
      id: `tencent-official-${index}-${match[1]}`,
      title: `腾讯：${decodeFeedText(match[3])}`,
      url: match[1],
      source: "腾讯投资者关系",
      publishedAt: new Date(`${match[2].replaceAll(".", "-")}T12:00:00+08:00`).toISOString(),
      priority: 1 as const,
      reason: "公司官方投资者公告",
      actor: "腾讯",
      official: true,
      targets: ["tencent"],
    }));
}

async function fetchInnolightAnnouncements(): Promise<RawSignal[]> {
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
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`eastmoney ${response.status}`);
  const payload = await response.json();
  return (payload?.data?.list ?? []).slice(0, 10).flatMap((item: Record<string, unknown>) => {
    const title = typeof item.title === "string" ? item.title : "";
    const code = typeof item.art_code === "string" ? item.art_code : "";
    const dateValue = typeof item.notice_date === "string" ? item.notice_date : "";
    const url = safeNewsUrl(`https://data.eastmoney.com/notices/detail/300308/${code}.html`);
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
      targets: ["innolight"],
    }];
  });
}

async function fetchSecFilings(): Promise<RawSignal[]> {
  const results = await Promise.allSettled(secCompanies.map(async ({ id, actor, cik }) => {
    const response = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
      headers: { "User-Agent": "MarketSignalDesk contact@example.com", Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`sec ${response.status}`);
    const payload = await response.json();
    const recent = payload?.filings?.recent;
    if (!recent?.accessionNumber) return [];
    const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000;
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
        targets: [id],
      }];
    }).slice(0, 6);
  }));
  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

export async function GET() {
  const now = Date.now();
  if (cachedNews && cachedNews.expiresAt > now) {
    return NextResponse.json(cachedNews.payload, {
      headers: {
        "Cache-Control": "public, max-age=180, stale-while-revalidate=900",
        "X-News-Cache": "HIT",
      },
    });
  }

  const sourceTasks = [
    ...nasdaqSources.map((source) => ({
      label: `Nasdaq:${source.symbol}`,
      task: fetchNasdaq(source),
    })),
    ...nasdaqCoverageFeeds.map((source) => ({
      label: `Nasdaq主题:${source.symbol}`,
      task: fetchNasdaqCoverage(source),
    })),
    ...publicQueries.map((query, index) => ({
      label: `${query.provider}:${index + 1}`,
      task: fetchPublicNews(query),
    })),
    { label: "腾讯投资者关系", task: fetchTencentAnnouncements() },
    { label: "东方财富公告索引", task: fetchInnolightAnnouncements() },
    { label: "SEC EDGAR", task: fetchSecFilings() },
  ];
  const sources = await Promise.allSettled(sourceTasks.map(({ task }) => task));

  const signals = rankSignals(
    keepRecentSignals(
      sources.flatMap((result) => result.status === "fulfilled" ? result.value : []),
      45,
      now,
    ),
    now,
  ).slice(0, 120);

  const payload: NewsPayload = {
    signals,
    fetchedAt: new Date(now).toISOString(),
    status: {
      workingSources: sources.filter((result) => result.status === "fulfilled").length,
      totalSources: sources.length,
      recent24h: signals.filter(({ publishedAt }) => now - new Date(publishedAt).getTime() <= 86_400_000).length,
      coverage: {
        p1: signals.filter(({ priority }) => priority === 1).length,
        p2: signals.filter(({ priority }) => priority === 2).length,
        p3: signals.filter(({ priority }) => priority === 3).length,
        p4: signals.filter(({ priority }) => priority === 4).length,
      },
      failedSources: sourceTasks
        .filter((_, index) => sources[index].status === "rejected")
        .map(({ label }) => label),
    },
  };
  cachedNews = { expiresAt: now + NEWS_CACHE_MS, payload };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=180, stale-while-revalidate=900",
      "X-News-Cache": "MISS",
    },
  });
}
