import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const minimumFontSize = 14;

test("keeps every explicit CSS font size at or above the readability floor", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--font-floor:\s*14px/);

  const declarations = css.match(/font(?:-size)?\s*:[^;]+/g) ?? [];
  const violations = declarations.filter((declaration) => {
    const sizes = [...declaration.matchAll(/(\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1]));
    return sizes.some((size) => size < minimumFontSize);
  });

  assert.deepEqual(violations, [], `字号不得低于 ${minimumFontSize}px：\n${violations.join("\n")}`);
});

test("keeps watchlist price cards inside a two-row layout", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /\.stock-rail-track button span\s*\{[^}]*grid-row:\s*1\s*\/\s*3/s);
  assert.match(css, /\.stock-rail-track button b\s*\{[^}]*grid-row:\s*1/s);
  assert.match(css, /\.stock-rail-track button i\s*\{[^}]*grid-row:\s*2/s);
  assert.match(css, /\.stock-rail-track button i\s*\{[^}]*white-space:\s*nowrap/s);
});
