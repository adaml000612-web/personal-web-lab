import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { requireAdminApi } from "../app/admin-guard.ts";
import { decryptSecret, encryptSecret } from "../server/admin-crypto.ts";

test("blocks non-admin requests and protects admin mutations", () => {
  const denied = requireAdminApi(new Request("https://example.test/api/admin/overview"));
  assert.equal("response" in denied, true);
  assert.equal(denied.response.status, 404);

  const localRead = requireAdminApi(new Request("http://localhost:4174/api/admin/overview", {
    headers: { host: "localhost:4174" },
  }));
  assert.equal("email" in localRead, true);

  const missingCsrf = requireAdminApi(new Request("http://localhost:4174/api/admin/model", {
    method: "POST",
    headers: { host: "localhost:4174" },
  }), true);
  assert.equal("response" in missingCsrf, true);
  assert.equal(missingCsrf.response.status, 403);

  const allowedMutation = requireAdminApi(new Request("http://localhost:4174/api/admin/model", {
    method: "POST",
    headers: {
      host: "localhost:4174",
      origin: "http://localhost:4174",
      "x-admin-action": "frontier-admin",
    },
  }), true);
  assert.equal("email" in allowedMutation, true);
});

test("encrypts saved provider secrets with randomized authenticated encryption", async () => {
  const secret = "sk-test-this-value-must-never-be-visible";
  const first = await encryptSecret(secret);
  const second = await encryptSecret(secret);
  assert.notEqual(first, second);
  assert.doesNotMatch(first, /sk-test/);
  assert.equal(await decryptSecret(first), secret);
  await assert.rejects(() => decryptSecret(`${first.slice(0, -2)}aa`));
});

test("keeps administrator and provider secrets out of committed defaults", async () => {
  const [exampleEnv, modelRoute, adminClient, adminCss] = await Promise.all([
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/model/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-console.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin.css", import.meta.url), "utf8"),
  ]);
  assert.match(exampleEnv, /ADMIN_EMAIL=\s*$/m);
  assert.match(exampleEnv, /ADMIN_SECRET=\s*$/m);
  assert.match(exampleEnv, /DEEPSEEK_API_KEY=\s*$/m);
  assert.doesNotMatch(`${modelRoute}\n${adminClient}`, /sk-[A-Za-z0-9_-]{20,}/);
  assert.match(adminClient, /页面不会回显完整内容/);
  for (const match of adminCss.matchAll(/(?:font-size:\s*|font:\s*\d+\s+)(\d+)px/g)) {
    assert.ok(Number(match[1]) >= 14, `admin font size ${match[1]}px is below the 14px floor`);
  }
});
