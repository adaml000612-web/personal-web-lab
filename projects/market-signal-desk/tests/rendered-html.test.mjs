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
  for (const content of ["前哨 · 投资情报雷达", "情报雷达", "行情入门", "市场信号", "英伟达", "SpaceX", "腾讯", "中际旭创", "指数脉冲"]) {
    assert.match(html, new RegExp(content));
  }
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("keeps market coverage configurable and honest", async () => {
  const [config, newsRoute] = await Promise.all([
    readFile(new URL("../app/market-config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/news/route.ts", import.meta.url), "utf8"),
  ]);

  for (const content of ['symbol: "PRIVATE"', '"usNVDA"', '"hk00700"', '"sz300308"']) {
    assert.match(config, new RegExp(content));
  }
  assert.doesNotMatch(config, /symbol:\s*"SPCX"/);
  assert.match(newsRoute, /SEC EDGAR|腾讯投资者关系|东方财富公告索引/);
});
