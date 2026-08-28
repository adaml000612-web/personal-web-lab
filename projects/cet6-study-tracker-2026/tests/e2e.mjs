import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_PATH,
    "playwright",
    "D:/AppCache/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    "C:/Users/huorenbo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next already-installed runtime location.
    }
  }

  throw new Error(
    "找不到本机 Playwright。请设置 PLAYWRIGHT_PATH，或用已配置 NODE_PATH 的 Node 运行本文件。"
  );
}

const { chromium } = loadPlaywright();
const BASE_URL = new URL(process.env.BASE_URL || "http://127.0.0.1:4173/").href;
const STORAGE_KEY = "cet6-checkin:cet6-2026-v1";

function browserLaunchOptions() {
  const executableCandidates = [
    process.env.BROWSER_PATH,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"
  ].filter(Boolean);
  const executablePath = executableCandidates.find((candidate) => existsSync(candidate));
  return executablePath ? { headless: true, executablePath } : { headless: true };
}

function urlForDate(date) {
  const url = new URL(BASE_URL);
  url.searchParams.set("date", date);
  return url.href;
}

async function waitForApp(page, expectedDate) {
  await page.waitForFunction(
    (date) =>
      Boolean(window.__CET6_TRACKER__) &&
      (!date || window.__CET6_TRACKER__.getSelectedDate() === date),
    expectedDate,
    { timeout: 10_000 }
  );
}

async function testStep(name, action) {
  const startedAt = Date.now();
  try {
    await action();
    console.log(`PASS  ${name} (${Date.now() - startedAt} ms)`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

async function main() {
  const browser = await chromium.launch(browserLaunchOptions());

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "zh-CN",
      timezoneId: "Asia/Shanghai",
      acceptDownloads: true,
      serviceWorkers: "allow"
    });
    const page = await context.newPage();
    const consoleErrors = [];
    let exportedBackupBuffer;
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await testStep("390×844：清空旧记录并默认打开预启动日 9 月 7 日", async () => {
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForApp(page, "2026-09-07");

      assert.equal(
        await page.evaluate(() => window.__CET6_TRACKER__.getSelectedDate()),
        "2026-09-07"
      );
      assert.match(await page.locator("#today-heading").innerText(), /9 月 7 日/);
      assert.equal(await page.locator(".task-check").count(), 5);
      await page.locator("#complete-day").waitFor({ state: "visible" });
    });

    await testStep("首项勾选后自动保存，刷新页面仍保持", async () => {
      const firstTask = page.locator(".task-check").first();
      await firstTask.check();
      assert.equal(await page.locator("#progress-count").innerText(), "1/5 项");

      const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
      assert.equal(saved.days["2026-09-07"].tasks["2026-09-07-word"].done, true);

      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForApp(page, "2026-09-07");
      assert.equal(await page.locator(".task-check").first().isChecked(), true);
      assert.equal(await page.locator("#progress-count").innerText(), "1/5 项");
    });

    await testStep("一键完成后，日历把 9 月 7 日标为已完成", async () => {
      await page.locator("#complete-day").click();
      assert.equal(await page.locator(".task-check:checked").count(), 5);
      assert.equal(await page.locator("#progress-count").innerText(), "5/5 项");
      assert.equal(await page.locator("#complete-day").isDisabled(), true);
      assert.equal(
        await page.evaluate(() => window.__CET6_TRACKER__.dayStatus("2026-09-07")),
        "complete"
      );

      await page.locator("#date-display").click();
      await page.locator("#calendar-view").waitFor({ state: "visible" });
      const completedDay = page.locator(
        '.calendar-day[aria-label*="9 月 7 日"][aria-label*="已完成"]'
      );
      assert.equal(await completedDay.count(), 1);
      assert.equal(await completedDay.locator(".status-dot.complete").count(), 1);
    });

    await testStep("10 月 2 日是完全休息日，没有任何可勾选任务", async () => {
      await page.goto(urlForDate("2026-10-02"), { waitUntil: "domcontentloaded" });
      await waitForApp(page, "2026-10-02");
      assert.match(await page.locator("#day-type-chip").innerText(), /旅行.*完全(?:休息|留空)/);
      assert.equal(await page.locator(".task-check").count(), 0);
      assert.equal(await page.locator("#complete-day").isHidden(), true);
      assert.equal(await page.locator("#empty-day").isVisible(), true);
      assert.equal(
        await page.evaluate(() => window.__CET6_TRACKER__.dayStatus("2026-10-02")),
        "rest"
      );
    });

    await testStep("11 月 12 日运动会只保留 1 项轻量任务", async () => {
      await page.goto(urlForDate("2026-11-12"), { waitUntil: "domcontentloaded" });
      await waitForApp(page, "2026-11-12");
      assert.match(await page.locator("#day-type-chip").innerText(), /运动会/);
      assert.equal(await page.locator(".task-check").count(), 1);
      assert.match(await page.locator(".task-copy strong").innerText(), /单词/);
    });

    await testStep("可导出结构完整、包含已完成记录的 JSON 备份", async () => {
      await page.locator("#settings-button").click();
      await page.locator("#settings-dialog[open]").waitFor({ state: "visible" });
      const downloadPromise = page.waitForEvent("download", { timeout: 10_000 });
      await page.locator("#export-button").click();
      const download = await downloadPromise;
      assert.match(download.suggestedFilename(), /^cet6-checkin-backup-\d{4}-\d{2}-\d{2}\.json$/);

      const downloadPath = await download.path();
      assert.ok(downloadPath, "Playwright 未返回下载文件路径");
      exportedBackupBuffer = await readFile(downloadPath);
      const backup = JSON.parse(exportedBackupBuffer.toString("utf8"));
      assert.equal(backup.schemaVersion, 1);
      assert.equal(backup.planVersion, "cet6-2026-v1");
      assert.equal(
        Object.values(backup.days["2026-09-07"].tasks).filter((task) => task.done).length,
        5
      );
      assert.match(backup.warning, /个人备注/);
    });

    await testStep("导出 → 清空 → 恢复后，原有打卡完整回来", async () => {
      page.once("dialog", (dialog) => dialog.accept());
      await page.locator("#reset-all").click();
      assert.equal(
        await page.evaluate(() => Object.keys(window.__CET6_TRACKER__.getState().days).length),
        0
      );

      page.once("dialog", (dialog) => dialog.accept());
      await page.locator("#import-file").setInputFiles({
        name: "cet6-checkin-backup.json",
        mimeType: "application/json",
        buffer: exportedBackupBuffer
      });
      await page.waitForFunction(() =>
        Object.values(
          window.__CET6_TRACKER__.getState().days["2026-09-07"]?.tasks || {}
        ).filter((task) => task.done).length === 5
      );
      assert.equal(
        await page.evaluate(() =>
          Object.values(window.__CET6_TRACKER__.getState().days["2026-09-07"].tasks)
            .filter((task) => task.done).length
        ),
        5
      );
    });

    await testStep("Service Worker 接管后可以断网刷新并继续读取计划", async () => {
      await page.evaluate(async () => {
        const ready = navigator.serviceWorker.ready;
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("等待 Service Worker 超时")), 10_000)
        );
        await Promise.race([ready, timeout]);
      });

      // A reload ensures the page is controlled even on browsers that do not
      // immediately attach a newly activated worker to the first document.
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForApp(page, "2026-11-12");
      assert.equal(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), true);

      await context.setOffline(true);
      try {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 10_000 });
        await waitForApp(page, "2026-11-12");
        assert.equal(await page.locator(".task-check").count(), 1);
        assert.equal(
          await page.evaluate((key) => Boolean(localStorage.getItem(key)), STORAGE_KEY),
          true
        );
      } finally {
        await context.setOffline(false);
      }
    });

    assert.deepEqual(consoleErrors, [], `页面出现控制台错误：\n${consoleErrors.join("\n")}`);
    await context.close();

    await testStep("360×640：页面无横向溢出，底部导航可见", async () => {
      const compactContext = await browser.newContext({
        viewport: { width: 360, height: 640 },
        locale: "zh-CN",
        timezoneId: "Asia/Shanghai",
        serviceWorkers: "block"
      });
      try {
        const compactPage = await compactContext.newPage();
        await compactPage.goto(urlForDate("2026-09-07"), { waitUntil: "domcontentloaded" });
        await waitForApp(compactPage, "2026-09-07");
        const dimensions = await compactPage.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth
        }));
        assert.ok(
          dimensions.documentScrollWidth <= dimensions.viewport,
          `document 横向溢出：${JSON.stringify(dimensions)}`
        );
        assert.ok(
          dimensions.bodyScrollWidth <= dimensions.viewport,
          `body 横向溢出：${JSON.stringify(dimensions)}`
        );
        assert.equal(await compactPage.locator(".bottom-nav").isVisible(), true);
      } finally {
        await compactContext.close();
      }
    });
  } finally {
    await browser.close();
  }

  console.log(`\n全部手机端 E2E 校验通过：${BASE_URL}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
