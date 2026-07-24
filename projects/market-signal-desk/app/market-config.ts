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
  targets: string[];
  score: number;
  factors: string[];
};

export type RawSignal = Omit<Signal, "score" | "factors">;

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
  { id: "nvda", actor: "英伟达", values: ["nvidia", "nvda"] },
  { id: "spacex", actor: "SpaceX", values: ["spacex"] },
  { id: "tsla", actor: "特斯拉", values: ["tesla", "tsla"] },
  { id: "googl", actor: "谷歌", values: ["alphabet", "google", "googl"] },
  { id: "tencent", actor: "腾讯", values: ["tencent"] },
  { id: "innolight", actor: "中际旭创", values: ["innolight", "中际旭创"] },
];

export const topicRules = [
  { pattern: /(ai|artificial intelligence|chip|semiconductor|gpu|光模块|算力)/i, targets: ["nvda", "googl", "tencent", "innolight"] },
  { pattern: /(autonomous|electric vehicle|ev\b|robotaxi|自动驾驶|电动车)/i, targets: ["tsla", "googl", "nvda"] },
  { pattern: /(cloud|data center|datacenter|云计算|数据中心)/i, targets: ["googl", "tencent", "nvda", "innolight"] },
  { pattern: /(spaceflight|rocket|launch|satellite|航天|火箭|卫星)/i, targets: ["spacex"] },
] as const;

export const nasdaqSources = [
  { symbol: "NVDA" }, { symbol: "TSLA" }, { symbol: "GOOGL" },
  { symbol: "AMD", actor: "AMD", aliases: ["amd", "advanced micro devices"], targets: ["nvda", "innolight"] },
  { symbol: "AVGO", actor: "博通", aliases: ["broadcom", "avgo"], targets: ["nvda", "innolight"] },
  { symbol: "TSM", actor: "台积电", aliases: ["taiwan semiconductor", "tsmc"], targets: ["nvda", "innolight"] },
  { symbol: "RKLB", actor: "Rocket Lab", aliases: ["rocket lab", "rklb"], targets: ["spacex"] },
  { symbol: "META", actor: "Meta", aliases: ["meta platforms", "meta stock"], targets: ["googl", "tencent"] },
  { symbol: "BABA", actor: "阿里巴巴", aliases: ["alibaba", "baba"], targets: ["tencent"] },
] as const;

export const secCompanies = [
  { id: "nvda", actor: "英伟达", cik: "0001045810" },
  { id: "tsla", actor: "特斯拉", cik: "0001318605" },
  { id: "googl", actor: "谷歌", cik: "0001652044" },
] as const;
