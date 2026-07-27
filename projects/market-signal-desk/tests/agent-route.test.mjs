import assert from "node:assert/strict";
import test from "node:test";

async function worker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("agent-test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

const context = {
  quotes: [{
    id: "nvda",
    symbol: "NVDA",
    name: "英伟达",
    market: "美股",
    type: "stock",
    value: 100,
    previous: 99,
    open: 99,
    high: 101,
    low: 98,
    changePct: 1.01,
    currency: "USD",
    updatedAt: Date.now(),
  }],
  signals: [],
  activeSymbol: "NVDA",
  watchlistSymbols: ["NVDA"],
};

test("serves the safe data fallback without exposing a model key", async () => {
  const app = await worker();
  const response = await app.fetch(new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify({ message: "一分钟看懂今天", context, model: { provider: "default" } }),
  }), {}, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json();
  assert.equal(data.engine, "data");
  assert.doesNotMatch(JSON.stringify(data), /apiKey|sk-/i);
});

test("rejects arbitrary model endpoints and oversized bodies", async () => {
  const app = await worker();
  const invalidModel = await app.fetch(new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify({
      message: "hi",
      context,
      model: { provider: "https://internal.example", model: "anything", apiKey: "x".repeat(30) },
    }),
  }), {}, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(invalidModel.status, 400);

  const mismatchedModel = await app.fetch(new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify({
      message: "hi",
      context,
      model: { provider: "deepseek", model: "gpt-5.6-terra", apiKey: "x".repeat(30) },
    }),
  }), {}, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(mismatchedModel.status, 400);

  const oversized = await app.fetch(new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify({ message: "x".repeat(50_000), context }),
  }), {}, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(oversized.status, 413);
});

test("rejects cross-origin and non-JSON requests and returns rate-limit guidance", async () => {
  const app = await worker();
  const crossOrigin = await app.fetch(new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
    body: "{}",
  }), {}, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(crossOrigin.status, 403);

  const nonJson = await app.fetch(new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "{}",
  }), {}, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(nonJson.status, 415);

  const requestBody = JSON.stringify({
    message: "一分钟看懂今天",
    context,
    model: { provider: "default" },
  });
  const responses = [];
  for (let index = 0; index < 13; index += 1) {
    responses.push(await app.fetch(new Request("http://localhost/api/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost",
        "cf-connecting-ip": "192.0.2.10",
      },
      body: requestBody,
    }), {}, { waitUntil() {}, passThroughOnException() {} }));
  }
  assert.equal(responses.at(-1)?.status, 429);
  assert.equal(responses.at(-1)?.headers.get("retry-after"), "60");
});
