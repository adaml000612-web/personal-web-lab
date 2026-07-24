export type SearchInstrument = {
  id: string;
  query: string;
  symbol: string;
  name: string;
  market: string;
  type: "stock";
  currency: string;
};

export function parseStockSymbol(value: string): SearchInstrument | null {
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
  const unique = new Map<string, SearchInstrument>();
  value.split(/[\s,，]+/).slice(0, 5).forEach((part) => {
    const instrument = parseStockSymbol(part);
    if (instrument) unique.set(instrument.query, instrument);
  });
  return [...unique.values()];
}
