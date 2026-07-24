import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the market signal desk", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>前哨 · 投资情报雷达<\/title>/i);
  assert.match(html, /只看与你有关的/);
  assert.match(html, /市场信号/);
  assert.match(html, /英伟达/);
  assert.match(html, /SpaceX/);
  assert.match(html, /腾讯/);
  assert.match(html, /中际旭创/);
  assert.match(html, /指数脉冲/);
  assert.doesNotMatch(html, /codex-preview/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("keeps private-company and future-listing data honest", async () => {
  const [dashboard, marketRoute, newsRoute] = await Promise.all([
    readFile(new URL("../app/market-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/market/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/news/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /symbol:\s*"PRIVATE".*name:\s*"SpaceX"/);
  assert.match(dashboard, /正式上市并确认交易代码后接入/);
  assert.doesNotMatch(marketRoute, /symbol:\s*"SPCX"/);
  assert.match(marketRoute, /query:\s*"usNVDA"/);
  assert.match(marketRoute, /query:\s*"hk00700"/);
  assert.match(marketRoute, /query:\s*"sz300308"/);
  assert.match(newsRoute, /SEC EDGAR/);
  assert.match(newsRoute, /腾讯投资者关系/);
  assert.match(newsRoute, /东方财富公告索引/);
});
