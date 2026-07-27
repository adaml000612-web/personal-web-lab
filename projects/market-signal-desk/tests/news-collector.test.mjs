import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyHeadline,
  keepRecentSignals,
  parseNewsFeed,
  safeNewsUrl,
} from "../app/news-collector.ts";

function feed(title, url, publishedAt) {
  return `<rss><channel><item><title>${title}</title><link>${url}</link><pubDate>${publishedAt}</pubDate></item></channel></rss>`;
}

test("parses aggregated RSS without treating the publisher as part of the headline", () => {
  const signals = parseNewsFeed(`
    <rss><channel><item>
      <title>Nvidia unveils a new AI chip - Example News</title>
      <link>https://news.example.com/nvidia-chip</link>
      <pubDate>Mon, 27 Jul 2026 10:30:00 GMT</pubDate>
      <source url="https://example.com">Example News</source>
    </item></channel></rss>
  `, { source: "Google News" });

  assert.equal(signals.length, 1);
  assert.equal(signals[0].title, "Nvidia unveils a new AI chip");
  assert.equal(signals[0].source, "Google News · Example News");
  assert.equal(signals[0].priority, 1);
  assert.deepEqual(signals[0].targets, ["nvda"]);
});

test("classifies all four relationship layers", () => {
  assert.equal(classifyHeadline("腾讯发布季度业绩")?.priority, 1);
  assert.equal(classifyHeadline("Data center spending lifts optical module demand")?.priority, 2);
  assert.equal(classifyHeadline("Nasdaq futures rise before the open")?.priority, 3);
  assert.equal(classifyHeadline("Broadcom expands its AI accelerator roadmap")?.priority, 4);
});

test("rejects unsafe links, oversized feeds and stale general news", () => {
  assert.equal(safeNewsUrl("javascript:alert(1)"), "");
  assert.deepEqual(parseNewsFeed("x".repeat(2_000_001), { source: "Google News" }), []);

  const current = {
    id: "current",
    title: "Current",
    url: "https://example.com/current",
    source: "Example",
    publishedAt: "2026-07-27T09:00:00Z",
    priority: 3,
    reason: "指数",
    actor: "指数",
    official: false,
    targets: ["nvda"],
  };
  const stale = { ...current, id: "stale", publishedAt: "2026-07-01T09:00:00Z" };
  assert.deepEqual(
    keepRecentSignals([stale, current], 3, Date.parse("2026-07-27T12:00:00Z")).map(({ id }) => id),
    ["current"],
  );
});

test("keeps a curated market query in its intended information layer", () => {
  const signals = parseNewsFeed(
    feed("Nvidia lifts the Nasdaq", "https://example.com/market", new Date().toUTCString()),
    {
      source: "Google News",
      fallback: {
        priority: 3,
        reason: "关注标的所属市场指数信号",
        actor: "指数",
        targets: ["nvda"],
      },
      preferFallback: true,
    },
  );
  assert.equal(signals[0]?.priority, 3);
  assert.equal(signals[0]?.actor, "指数");
});
