import assert from "node:assert/strict";
import test from "node:test";
import { addMovingAverages, aggregatePoints } from "../app/kline.ts";

test("calculates MA5, MA10 and MA20 without inventing early values", () => {
  const points = Array.from({ length: 20 }, (_, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, "0")}`,
    open: index + 1,
    close: index + 1,
    high: index + 2,
    low: index,
    volume: 100 + index,
  }));
  const result = addMovingAverages(points);

  assert.equal(result[3].ma5, null);
  assert.equal(result[4].ma5, 3);
  assert.equal(result[9].ma10, 5.5);
  assert.equal(result[19].ma20, 10.5);
});

test("aggregates daily candles into a weekly candle", () => {
  const daily = [
    { date: "2026-07-20", open: 10, close: 11, high: 12, low: 9, volume: 100 },
    { date: "2026-07-21", open: 11, close: 13, high: 14, low: 10, volume: 200 },
  ];
  assert.deepEqual(aggregatePoints(daily, "week"), [
    { date: "2026-07-21", open: 10, close: 13, high: 14, low: 9, volume: 300 },
  ]);
});
