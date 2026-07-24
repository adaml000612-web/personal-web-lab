import assert from "node:assert/strict";
import test from "node:test";
import {
  isEnglishHeadline,
  isValidTranslationText,
  signalTime,
  translationFromResponse,
  translationUrl,
} from "../app/signal-presentation.ts";

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

test("builds and validates a browser translation request", () => {
  const url = new URL(translationUrl("Nvidia announces a new AI chip"));
  assert.equal(url.searchParams.get("langpair"), "en|zh-CN");
  assert.equal(url.searchParams.get("q"), "Nvidia announces a new AI chip");
  assert.equal(translationFromResponse({
    responseStatus: 200,
    responseData: { translatedText: "英伟达发布新的人工智能芯片" },
  }), "英伟达发布新的人工智能芯片");
  assert.equal(translationFromResponse({
    responseStatus: 403,
    responseData: { translatedText: "MYMEMORY WARNING: limit" },
  }), null);
});
