import assert from "node:assert/strict";
import test from "node:test";

async function worker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("security-test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const ctx = { waitUntil() {}, passThroughOnException() {} };

test("adds browser security headers to pages and API responses", async () => {
  const app = await worker();
  const page = await app.fetch(new Request("https://example.test/"), env, ctx);
  const rejectedApi = await app.fetch(new Request("https://example.test/api/agent", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "{}",
  }), env, ctx);

  for (const response of [page, rejectedApi]) {
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
    assert.match(response.headers.get("permissions-policy") ?? "", /camera=\(\)/);
    assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
    assert.match(response.headers.get("content-security-policy") ?? "", /object-src 'none'/);
    assert.match(response.headers.get("strict-transport-security") ?? "", /max-age=31536000/);
  }
  assert.equal(rejectedApi.status, 415);
});
