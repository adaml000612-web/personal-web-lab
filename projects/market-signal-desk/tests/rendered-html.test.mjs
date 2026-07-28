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
  for (const content of ["前哨 · 投资情报雷达", "情报雷达", "行情入门", "今日重点", "全部信号", "公司级", "尚未阅读", "LIVE PULSE", "v2.9.5", "实时情报雷达", "每 5 圈自动刷新新闻", "问前哨"]) {
    assert.match(html, new RegExp(content));
  }
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("keeps market coverage configurable and honest", async () => {
  const [config, newsRoute, dashboard, beginnerMarket, agentRoute, agentProviders, agentRequest, agentPanel, settings, settingsPanel] = await Promise.all([
    readFile(new URL("../app/market-config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/news/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/market-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/beginner-market.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/agent/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/agent/providers.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/agent/request.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/market-agent-panel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/settings.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/settings-panel.tsx", import.meta.url), "utf8"),
  ]);
  const agentServer = `${agentRoute}\n${agentProviders}\n${agentRequest}`;

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
  assert.match(agentProviders, /api\.deepseek\.com\/v1\/chat\/completions/);
  assert.match(agentProviders, /api\.anthropic\.com\/v1\/messages/);
  assert.match(agentProviders, /generativelanguage\.googleapis\.com/);
  assert.match(agentProviders, /api\.z\.ai\/api\/paas\/v4\/chat\/completions/);
  assert.match(agentProviders, /api\.x\.ai\/v1\/chat\/completions/);
  assert.match(agentProviders, /dashscope\.aliyuncs\.com\/compatible-mode\/v1\/chat\/completions/);
  assert.match(agentProviders, /api\.minimaxi\.com\/v1\/chat\/completions/);
  assert.match(agentProviders, /api\.moonshot\.cn\/v1\/chat\/completions/);
  assert.match(agentRequest, /new TextEncoder\(\)\.encode\(rawBody\)/);
  assert.match(agentRequest, /isSupportedModel/);
  assert.match(agentRequest, /Cache-Control": "no-store"/);
  assert.match(agentRoute, /buildFallbackAgentAnswer/);
  assert.match(agentRoute, /gpt-5\.6-luna/);
  assert.match(agentPanel, /sessionSecretStorageKey/);
  assert.match(settings, /fontSize:\s*14/);
  assert.match(settings, /mainModules:\s*\["radar", "prices"\]/);
  assert.match(settingsPanel, /把前哨调成你的样子/);
  assert.match(settingsPanel, /选择具体模型/);
  assert.match(settingsPanel, /填写.*API Key/);
  assert.match(settingsPanel, /modelCatalog/);
  assert.match(settingsPanel, /最近三个月发布或更新/);
  assert.match(settingsPanel, /settings-provider-filters/);
  assert.match(settingsPanel, /settings-model-table-head/);
  assert.doesNotMatch(settingsPanel, /settings-provider-group/);
  assert.match(settings, /claude-fable-5/);
  assert.match(settings, /claude-opus-4-8/);
  assert.match(settings, /gemini-3\.6-flash/);
  assert.match(settings, /glm-5\.2/);
  assert.match(settings, /kimi-k3/);
  assert.match(settings, /kimi-k2\.7-code-highspeed/);
  assert.doesNotMatch(settingsPanel, /收录依据/);
  assert.match(settingsPanel, /关闭这个浏览器标签页后自动失效/);
  assert.doesNotMatch(settings, /\bapiKey\s*:/);
  assert.doesNotMatch(agentServer, /sk-[A-Za-z0-9]/);
  assert.doesNotMatch(agentRequest, /x-forwarded-for/i);
});
