import assert from "node:assert/strict";
import test from "node:test";
import { buildFallbackAgentAnswer } from "../app/market-agent.ts";

const context = {
  activeSymbol: "NVDA",
  watchlistSymbols: ["NVDA", "TSLA"],
  quotes: [
    { id: "nvda", symbol: "NVDA", name: "英伟达", market: "美股", type: "stock", value: 180, previous: 184, open: 183, high: 185, low: 178, changePct: -2.17, currency: "USD", updatedAt: Date.now() },
    { id: "tsla", symbol: "TSLA", name: "特斯拉", market: "美股", type: "stock", value: 320, previous: 315, open: 316, high: 324, low: 314, changePct: 1.59, currency: "USD", updatedAt: Date.now() },
    { id: "nasdaq", symbol: "^IXIC", name: "纳斯达克", market: "美国", type: "index", value: 24000, previous: 24100, open: 24100, high: 24200, low: 23900, changePct: -0.41, currency: "USD", updatedAt: Date.now() },
  ],
  signals: [
    { id: "s1", title: "Nvidia files quarterly report", url: "https://example.com/report", source: "SEC", publishedAt: new Date().toISOString(), priority: 1, reason: "公司官方披露", actor: "英伟达", official: true, targets: ["nvda"], score: 95 },
  ],
};

test("builds a beginner-friendly market brief from real values", () => {
  const result = buildFallbackAgentAnswer("一分钟看懂今天", context);
  assert.equal(result.intent, "brief");
  assert.match(result.answer, /纳斯达克 -0\.41%/);
  assert.match(result.answer, /相对最强是特斯拉 \+1\.59%/);
});

test("explains the selected stock without inventing causality", () => {
  const result = buildFallbackAgentAnswer("英伟达为什么跌", context);
  assert.equal(result.intent, "explain");
  assert.match(result.answer, /英伟达今天 -2\.17%/);
  assert.match(result.answer, /同时发生不等于因果/);
  assert.equal(result.sources.length, 1);
});

test("turns drawdown percentages into household-scale money", () => {
  const result = buildFallbackAgentAnswer("投入2万元，如果下跌15%会怎样", context);
  assert.equal(result.intent, "risk");
  assert.match(result.answer, /20,000 元/);
  assert.match(result.answer, /3,000 元/);
  assert.doesNotMatch(result.answer, /建议买入|稳赚/);
});
