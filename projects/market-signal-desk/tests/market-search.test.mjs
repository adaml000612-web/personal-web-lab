import assert from "node:assert/strict";
import test from "node:test";
import { isSafeCompanyQuery, parseTencentStockSearch } from "../app/market-search.ts";

test("parses A-share, Hong Kong and US company search results", () => {
  const payload = String.raw`v_hint="sh~688825~\u957f\u946b\u79d1\u6280~cxkj~GP-A-KCB^hk~01810~\u5c0f\u7c73\u96c6\u56e2~xmjt~GP^us~aapl.oq~\u82f9\u679c~pg~GP^hk~11063~\u82f9\u679c\u6cd5\u5174~pgfx~QZ"`;
  const results = parseTencentStockSearch(payload);

  assert.deepEqual(
    results.map(({ query, symbol, name }) => ({ query, symbol, name })),
    [
      { query: "sh688825", symbol: "688825.SS", name: "长鑫科技" },
      { query: "hk01810", symbol: "01810.HK", name: "小米集团" },
      { query: "usAAPL", symbol: "AAPL", name: "苹果" },
    ],
  );
});

test("rejects unsafe company search text and non-stock products", () => {
  assert.equal(isSafeCompanyQuery("长鑫存储"), true);
  assert.equal(isSafeCompanyQuery("Advanced Micro Devices"), true);
  assert.equal(isSafeCompanyQuery("https://example.com"), false);
  assert.equal(isSafeCompanyQuery("<script>"), false);
  assert.deepEqual(parseTencentStockSearch(String.raw`v_hint="jj~020785~\u67d0\u503a\u5238~zq~KJ"`), []);
});
