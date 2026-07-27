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
  for (const content of ["前哨 · 投资情报雷达", "情报雷达", "行情入门", "今日重点", "全部信号", "公司级", "尚未阅读", "LIVE PULSE", "v2.7.0", "实时情报雷达", "每 5 圈自动刷新新闻", "问前哨"]) {
    assert.match(html, new RegExp(content));
  }
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("keeps market coverage configurable and honest", async () => {
  const [config, newsRoute, dashboard, beginnerMarket, agentRoute, agentPanel] = await Promise.all([
    readFile(new URL("../app/market-config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/news/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/market-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/beginner-market.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/agent/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/market-agent-panel.tsx", import.meta.url), "utf8"),
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
  assert.match(dashboard, /Promise\.allSettled\(\[marketTask, newsTask\]\)/);
  assert.match(dashboard, /msd-market-cache/);
  assert.match(dashboard, /pulse-group/);
  assert.match(dashboard, /brand-tiles/);
  assert.match(dashboard, /沪 · 港 · 美/);
  assert.doesNotMatch(dashboard, /brand-mark|MARKET OBSERVATORY/);
  assert.match(newsRoute, /SOURCE_TIMEOUT_MS = 5500/);
  assert.match(newsRoute, /OPTIONAL_SOURCE_TIMEOUT_MS = 2500/);
  assert.match(newsRoute, /Google News/);
  assert.match(newsRoute, /Bing News/);
  assert.match(newsRoute, /nasdaqCoverageFeeds/);
  assert.match(newsRoute, /MAX_RESPONSE_BYTES = 2_000_000/);
  assert.match(beginnerMarket, /行情快照/);
  assert.match(beginnerMarket, /当日位置/);
  assert.match(beginnerMarket, /较昨收/);
  assert.match(beginnerMarket, /beginner-guide beginner-guide--primary[\s\S]*quote-layout/);
  assert.match(beginnerMarket, /今日市场解读/);
  assert.match(beginnerMarket, /真实行情自动计算/);
  assert.match(beginnerMarket, /marketAnalysis\.insights/);
  assert.match(beginnerMarket, /我的关注/);
  assert.match(beginnerMarket, /加入关注/);
  assert.match(beginnerMarket, /msd-custom-watchlist/);
  assert.doesNotMatch(beginnerMarket, /先看懂价格/);
  assert.match(agentPanel, /一分钟看懂今天/);
  assert.match(agentPanel, /买前风险检查/);
  assert.match(agentPanel, /只做信息解释和风险陪练/);
  assert.match(agentRoute, /OPENAI_API_KEY/);
  assert.match(agentRoute, /buildFallbackAgentAnswer/);
  assert.match(agentRoute, /gpt-5\.6-luna/);
  assert.doesNotMatch(agentRoute, /sk-[A-Za-z0-9]/);
});
