export type Priority = 1 | 2 | 3 | 4;

export type Quote = {
  id: string;
  symbol: string;
  name: string;
  market: string;
  type: "stock" | "index";
  value: number;
  changePct: number | null;
  currency: string;
  updatedAt: number;
};

export type Signal = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  priority: Priority;
  reason: string;
  actor: string;
  official: boolean;
};

export const watchlist = [
  { id: "nvda", symbol: "NVDA", name: "英伟达", market: "美股", tone: "blue" },
  { id: "spacex", symbol: "PRIVATE", name: "SpaceX", market: "未上市", tone: "amber" },
  { id: "tsla", symbol: "TSLA", name: "特斯拉", market: "美股", tone: "coral" },
  { id: "googl", symbol: "GOOGL", name: "谷歌", market: "美股", tone: "blue" },
  { id: "tencent", symbol: "0700.HK", name: "腾讯", market: "港股", tone: "mint" },
  { id: "innolight", symbol: "300308.SZ", name: "中际旭创", market: "A股", tone: "amber" },
] as const;

export const instruments = [
  ...watchlist.filter(({ symbol }) => symbol !== "PRIVATE").map((item) => ({
    ...item,
    query: { nvda: "usNVDA", tsla: "usTSLA", googl: "usGOOGL", tencent: "hk00700", innolight: "sz300308" }[item.id],
    type: "stock" as const,
    currency: { nvda: "USD", tsla: "USD", googl: "USD", tencent: "HKD", innolight: "CNY" }[item.id],
  })),
  { id: "nasdaq", query: "usIXIC", symbol: "^IXIC", name: "纳斯达克", market: "美国", type: "index", currency: "USD" },
  { id: "sp500", query: "usINX", symbol: "^GSPC", name: "标普 500", market: "美国", type: "index", currency: "USD" },
  { id: "sse", query: "sh000001", symbol: "000001.SS", name: "上证指数", market: "中国", type: "index", currency: "CNY" },
] as const;

export const indexOrder = ["nasdaq", "sp500", "sse"];

export const sourceLinks = [
  ["SEC 披露", "https://www.sec.gov/edgar/search/"],
  ["巨潮资讯", "https://www.cninfo.com.cn/"],
  ["港交所披露易", "https://www1.hkexnews.hk/index_c.htm"],
  ["上交所公告", "https://www.sse.com.cn/disclosure/listedinfo/announcement/"],
] as const;

export const watchedAliases = [
  { actor: "英伟达", values: ["nvidia", "nvda"] },
  { actor: "SpaceX", values: ["spacex"] },
  { actor: "特斯拉", values: ["tesla", "tsla"] },
  { actor: "谷歌", values: ["alphabet", "google", "googl"] },
];

export const nasdaqSources = [
  { symbol: "NVDA" }, { symbol: "TSLA" }, { symbol: "GOOGL" },
  { symbol: "AMD", actor: "AMD", aliases: ["amd", "advanced micro devices"] },
  { symbol: "AVGO", actor: "博通", aliases: ["broadcom", "avgo"] },
  { symbol: "TSM", actor: "台积电", aliases: ["taiwan semiconductor", "tsmc"] },
  { symbol: "RKLB", actor: "Rocket Lab", aliases: ["rocket lab", "rklb"] },
  { symbol: "META", actor: "Meta", aliases: ["meta platforms", "meta stock"] },
  { symbol: "BABA", actor: "阿里巴巴", aliases: ["alibaba", "baba"] },
] as const;

export const secCompanies = [
  { actor: "英伟达", cik: "0001045810" },
  { actor: "特斯拉", cik: "0001318605" },
  { actor: "谷歌", cik: "0001652044" },
] as const;
