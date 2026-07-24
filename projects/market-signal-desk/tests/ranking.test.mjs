import assert from "node:assert/strict";
import test from "node:test";
import { rankSignals } from "../app/ranking.ts";

const now = Date.parse("2026-07-24T12:00:00Z");

function signal(overrides = {}) {
  return {
    id: "base",
    title: "Market update",
    url: "https://example.com/base",
    source: "Nasdaq RSS",
    publishedAt: "2026-07-24T10:00:00Z",
    priority: 2,
    reason: "同板块或产业链信号",
    actor: "产业链",
    official: false,
    targets: ["nvda", "innolight"],
    ...overrides,
  };
}

test("keeps P1 ahead while ranking stronger evidence first within a level", () => {
  const ranked = rankSignals([
    signal({ id: "sector", title: "Fresh sector signal" }),
    signal({ id: "filing", title: "Official filing", priority: 1, source: "SEC EDGAR", official: true, targets: ["nvda"] }),
    signal({ id: "older", title: "Older sector signal", publishedAt: "2026-07-18T10:00:00Z" }),
  ], now);

  assert.deepEqual(ranked.map(({ id }) => id), ["filing", "sector", "older"]);
  assert.ok(ranked[0].score > ranked[1].score);
  assert.match(ranked[0].factors.join(" "), /官方披露/);
});

test("deduplicates normalized headlines and keeps the stronger source", () => {
  const ranked = rankSignals([
    signal({ id: "weak", title: "NVIDIA — New AI Chip!", source: "Unknown" }),
    signal({ id: "strong", title: "NVIDIA New AI Chip", source: "SEC EDGAR", official: true }),
  ], now);

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].id, "strong");
});
