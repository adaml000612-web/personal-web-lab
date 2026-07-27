import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("applies the selected palette to every major product surface", async () => {
  const [css, dashboard] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/market-dashboard.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /"--iris": settings\.primaryColor/);
  assert.match(dashboard, /"--cyan": settings\.secondaryColor/);
  assert.match(css, /--theme-surface:\s*color-mix\(in srgb,\s*var\(--iris\)/);
  assert.match(css, /\.app-shell\s*\{[\s\S]*linear-gradient\(145deg,\s*var\(--theme-surface\),\s*var\(--theme-secondary-soft\)\)/);
  assert.match(css, /\.module-nav button\.is-active\s*\{\s*background:\s*linear-gradient\(110deg,\s*var\(--iris\),\s*var\(--cyan\)\)/);
  assert.match(css, /\.stock-search button,[\s\S]*background:\s*linear-gradient\(120deg,\s*var\(--iris\),\s*var\(--cyan\)\)/);
  assert.match(css, /\.true-radar\s*\{[\s\S]*color-mix\(in srgb,\s*white 76%,\s*var\(--iris\)\)/);
});

