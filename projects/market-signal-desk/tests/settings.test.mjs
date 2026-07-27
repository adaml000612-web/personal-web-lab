import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultSettings,
  isSupportedModel,
  sessionSecretStorageKey,
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

test("only accepts catalog models for their matching provider", () => {
  assert.equal(isSupportedModel("deepseek", "deepseek-v4-flash"), true);
  assert.equal(isSupportedModel("openai", "gpt-5-mini"), true);
  assert.equal(isSupportedModel("deepseek", "gpt-5-mini"), false);
  assert.equal(isSupportedModel("openai", "https://internal.example/model"), false);
  assert.notEqual(sessionSecretStorageKey("deepseek"), sessionSecretStorageKey("openai"));
});

test("repairs a provider and model mismatch", () => {
  const settings = sanitizeSettings({ customProvider: "openai", customModel: "deepseek-v4-pro" });
  assert.equal(settings.customProvider, "openai");
  assert.equal(settings.customModel, "gpt-5.1");
});
