import assert from "node:assert/strict";
import test from "node:test";
import { parseStockSymbol, parseStockSymbols } from "../app/market-symbol.ts";

test("normalizes beginner-friendly US, Hong Kong and A-share symbols", () => {
  assert.deepEqual(
    ["NVDA", "0700.HK", "300308", "600519", "000001.SS"].map((value) => parseStockSymbol(value)?.query),
    ["usNVDA", "hk00700", "sz300308", "sh600519", "sh000001"],
  );
});

test("rejects unsafe inputs and limits batch queries", () => {
  assert.equal(parseStockSymbol("https://example.com"), null);
  assert.equal(parseStockSymbol("NVDA<script>"), null);
  assert.equal(parseStockSymbols("NVDA TSLA GOOGL META AMD BABA").length, 5);
});
