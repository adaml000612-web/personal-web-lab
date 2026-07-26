import assert from "node:assert/strict";
import test from "node:test";
import { buildMarketAnalysis } from "../app/market-analysis.ts";

const quote = (values) => ({
  id: "unknown",
  symbol: "TEST",
  name: "测试标的",
  market: "美股",
  type: "stock",
  value: 100,
  previous: 100,
  open: 100,
  high: 105,
  low: 95,
  changePct: 0,
  currency: "USD",
  updatedAt: new Date("2026-07-26T12:00:00+08:00").getTime(),
  ...values,
});

test("explains a weak market from actual quote values", () => {
  const selected = quote({ id: "nvda", name: "英伟达", value: 206.84, previous: 208.76, high: 211.91, low: 204.81, changePct: -0.92 });
  const indices = [
    quote({ id: "nasdaq", name: "纳斯达克", type: "index", changePct: -0.64 }),
    quote({ id: "sp500", name: "标普 500", type: "index", changePct: 0.05 }),
    quote({ id: "sse", name: "上证指数", type: "index", market: "中国", changePct: -1.61 }),
  ];
  const analysis = buildMarketAnalysis(selected, indices);

  assert.equal(analysis.headline, "整体偏弱");
  assert.match(analysis.insights[0].evidence, /1 个上涨、2 个下跌/);
  assert.match(analysis.insights[1].title, /略弱于纳指/);
  assert.match(analysis.insights[2].title, /日内下部/);
  assert.match(analysis.insights[2].evidence, /29%/);
  assert.doesNotMatch(JSON.stringify(analysis), /买入|卖出/);
});

test("does not invent a Hong Kong benchmark", () => {
  const analysis = buildMarketAnalysis(
    quote({ id: "tencent", name: "腾讯", symbol: "0700.HK", market: "港股", currency: "HKD" }),
    [quote({ id: "nasdaq", name: "纳斯达克", type: "index", changePct: 1.1 })],
  );

  assert.match(analysis.insights[1].evidence, /尚无恒生指数数据/);
  assert.doesNotMatch(analysis.insights[1].evidence, /纳指/);
});
