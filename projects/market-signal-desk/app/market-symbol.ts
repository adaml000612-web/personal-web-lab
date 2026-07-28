export type SearchInstrument = {
  id: string;
  query: string;
  symbol: string;
  name: string;
  market: string;
  type: "stock";
  currency: string;
};

type KnownCompany = SearchInstrument & { aliases: readonly string[] };

const knownCompanies: readonly KnownCompany[] = [
  { id: "nvda", query: "usNVDA", symbol: "NVDA", name: "英伟达", market: "美股", type: "stock", currency: "USD", aliases: ["英伟达", "NVIDIA", "NVIDIA Corporation"] },
  { id: "spacex", query: "usSPCX", symbol: "SPCX", name: "SpaceX", market: "美股", type: "stock", currency: "USD", aliases: ["SpaceX", "太空探索技术公司"] },
  { id: "tsla", query: "usTSLA", symbol: "TSLA", name: "特斯拉", market: "美股", type: "stock", currency: "USD", aliases: ["特斯拉", "Tesla", "Tesla Inc"] },
  { id: "googl", query: "usGOOGL", symbol: "GOOGL", name: "谷歌", market: "美股", type: "stock", currency: "USD", aliases: ["谷歌", "Google", "Alphabet", "Alphabet Inc"] },
  { id: "tencent", query: "hk00700", symbol: "0700.HK", name: "腾讯控股", market: "港股", type: "stock", currency: "HKD", aliases: ["腾讯", "腾讯控股", "Tencent", "Tencent Holdings"] },
  { id: "innolight", query: "sz300308", symbol: "300308.SZ", name: "中际旭创", market: "A股", type: "stock", currency: "CNY", aliases: ["中际旭创", "Innolight"] },
  { id: "search-usamd", query: "usAMD", symbol: "AMD", name: "AMD", market: "美股", type: "stock", currency: "USD", aliases: ["AMD", "超威半导体", "Advanced Micro Devices"] },
  { id: "search-usavgo", query: "usAVGO", symbol: "AVGO", name: "博通", market: "美股", type: "stock", currency: "USD", aliases: ["博通", "Broadcom"] },
  { id: "search-ustsm", query: "usTSM", symbol: "TSM", name: "台积电", market: "美股", type: "stock", currency: "USD", aliases: ["台积电", "台灣積體電路", "TSMC", "Taiwan Semiconductor"] },
  { id: "search-usrklb", query: "usRKLB", symbol: "RKLB", name: "Rocket Lab", market: "美股", type: "stock", currency: "USD", aliases: ["Rocket Lab", "火箭实验室"] },
  { id: "search-usmeta", query: "usMETA", symbol: "META", name: "Meta", market: "美股", type: "stock", currency: "USD", aliases: ["Meta", "Meta Platforms", "Facebook", "脸书"] },
  { id: "search-usbaba", query: "usBABA", symbol: "BABA", name: "阿里巴巴", market: "美股", type: "stock", currency: "USD", aliases: ["阿里", "阿里巴巴", "Alibaba"] },
];

function normalizeCompanyName(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s\-_.·,，。'’"“”()（）]+/g, "");
}

const companiesByAlias = new Map(
  knownCompanies.flatMap((company) => company.aliases.map((alias) => [normalizeCompanyName(alias), company] as const)),
);

function findKnownCompany(value: string): SearchInstrument | null {
  const company = companiesByAlias.get(normalizeCompanyName(value));
  if (!company) return null;
  return {
    id: company.id,
    query: company.query,
    symbol: company.symbol,
    name: company.name,
    market: company.market,
    type: company.type,
    currency: company.currency,
  };
}

export function parseStockSymbol(value: string): SearchInstrument | null {
  const knownCompany = findKnownCompany(value);
  if (knownCompany) return knownCompany;

  const input = value.trim().toUpperCase();
  let code = input;
  let exchange: "us" | "hk" | "sh" | "sz";

  if (/^\d{1,5}\.HK$/.test(input)) {
    code = input.slice(0, -3).padStart(5, "0");
    exchange = "hk";
  } else if (/^\d{6}\.(SS|SH|SZ)$/.test(input)) {
    code = input.slice(0, 6);
    exchange = input.endsWith(".SZ") ? "sz" : "sh";
  } else if (/^\d{5}$/.test(input)) {
    exchange = "hk";
  } else if (/^\d{6}$/.test(input)) {
    exchange = /^[569]/.test(input) ? "sh" : "sz";
  } else if (/^[A-Z]{1,6}$/.test(input)) {
    exchange = "us";
  } else {
    return null;
  }

  const market = exchange === "us" ? "美股" : exchange === "hk" ? "港股" : "A股";
  const normalizedCode = exchange === "hk" ? code.padStart(5, "0") : code;
  const query = `${exchange}${normalizedCode}`;
  const symbol = exchange === "hk"
    ? `${code.padStart(5, "0")}.HK`
    : market === "A股"
      ? `${code}.${exchange === "sh" ? "SS" : "SZ"}`
      : code;

  return {
    id: `search-${query.toLowerCase()}`,
    query,
    symbol,
    name: symbol,
    market,
    type: "stock",
    currency: market === "美股" ? "USD" : market === "港股" ? "HKD" : "CNY",
  };
}

export function parseStockSymbols(value: string) {
  const wholeInput = parseStockSymbol(value);
  if (wholeInput) return [wholeInput];

  const unique = new Map<string, SearchInstrument>();
  value.split(/[\s,，]+/).slice(0, 5).forEach((part) => {
    const instrument = parseStockSymbol(part);
    if (instrument) unique.set(instrument.query, instrument);
  });
  return [...unique.values()];
}
