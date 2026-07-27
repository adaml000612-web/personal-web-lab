import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultSettings,
  isSafeModelName,
  sanitizeSettings,
} from "../app/settings.ts";

test("sanitizes visual preferences and keeps one main module", () => {
  const settings = sanitizeSettings({
    primaryColor: "red",
    secondaryColor: "#123456",
    fontSize: 99,
    mainModules: [],
    showPulse: false,
  });
  assert.equal(settings.primaryColor, defaultSettings.primaryColor);
  assert.equal(settings.secondaryColor, "#123456");
  assert.equal(settings.fontSize, 22);
  assert.deepEqual(settings.mainModules, defaultSettings.mainModules);
  assert.equal(settings.showPulse, false);
});

test("deduplicates and preserves the chosen module order", () => {
  const settings = sanitizeSettings({
    mainModules: ["prices", "radar", "prices", "unknown"],
  });
  assert.deepEqual(settings.mainModules, ["prices", "radar"]);
});

test("only accepts bounded model identifiers", () => {
  assert.equal(isSafeModelName("deepseek-v4-flash"), true);
  assert.equal(isSafeModelName("gpt-5.6-luna"), true);
  assert.equal(isSafeModelName("https://internal.example/model"), false);
  assert.equal(isSafeModelName("../secret"), false);
});
