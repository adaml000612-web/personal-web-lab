import assert from "node:assert/strict";
import test from "node:test";
import { isEnglishHeadline, isValidTranslationText, signalTime } from "../app/signal-presentation.ts";

test("detects headlines that benefit from translation", () => {
  assert.equal(isEnglishHeadline("Nvidia announces a new AI chip"), true);
  assert.equal(isEnglishHeadline("英伟达发布新款 AI 芯片"), false);
  assert.equal(isValidTranslationText("Nvidia announces a new AI chip"), true);
  assert.equal(isValidTranslationText("x".repeat(501)), false);
});

test("shows exact Beijing time for messages published today", () => {
  const now = new Date("2026-07-24T12:30:00Z");
  assert.equal(signalTime("2026-07-24T11:32:00Z", now), "今天 19:32");
  assert.equal(signalTime("2026-07-22T11:32:00Z", now), "2 天前");
});
