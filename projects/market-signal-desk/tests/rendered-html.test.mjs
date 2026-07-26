import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the market signal desk", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  for (const content of ["前哨 · 投资情报雷达", "情报雷达", "行情入门", "今日重点", "全部信号", "公司级", "尚未阅读", "LIVE PULSE", "v2.4.0", "实时情报雷达", "每 5 圈自动刷新新闻"]) {
    assert.match(html, new RegExp(content));
  }
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("keeps market coverage configurable and honest", async () => {
  const [config, newsRoute, dashboard, beginnerMarket] = await Promise.all([
    readFile(new URL("../app/market-config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/news/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/market-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/beginner-market.tsx", import.meta.url), "utf8"),
  ]);

  for (const content of ['symbol: "SPCX"', '"usNVDA"', '"usSPCX"', '"hk00700"', '"sz300308"', 'cik: "0001181412"']) {
    assert.match(config, new RegExp(content));
  }
  assert.doesNotMatch(config, /symbol:\s*"PRIVATE"/);
  assert.match(newsRoute, /SEC EDGAR|腾讯投资者关系|东方财富公告索引/);
  assert.doesNotMatch(dashboard, /vortex-filter-state|把市场噪音/);
  assert.doesNotMatch(dashboard, /radar-target radar-target/);
  assert.match(dashboard, /radar-echo radar-echo-p/);
  assert.match(dashboard, /radar-echo-hold-/);
  assert.match(dashboard, /setRadarSeed\(createRadarSeed\(\)\)/);
  assert.match(dashboard, /radarEchoStyle\(signal\.priority, index, radarSeed\)/);
  assert.match(beginnerMarket, /行情快照/);
  assert.match(beginnerMarket, /当日位置/);
  assert.match(beginnerMarket, /较昨收/);
  assert.match(beginnerMarket, /beginner-guide beginner-guide--primary[\s\S]*quote-layout/);
  assert.match(beginnerMarket, /今日市场解读/);
  assert.match(beginnerMarket, /真实行情自动计算/);
  assert.match(beginnerMarket, /marketAnalysis\.insights/);
  assert.doesNotMatch(beginnerMarket, /先看懂价格/);
});
