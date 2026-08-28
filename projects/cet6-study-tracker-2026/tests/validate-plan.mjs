import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(testDir, "..", "plan-data.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);
const plan = context.window.CET6_PLAN;

assert.equal(plan.planVersion, "cet6-2026-v1");
assert.equal(plan.days.length, 97, "计划应覆盖 97 个连续日期");
assert.equal(plan.days[0].date, "2026-09-07");
assert.equal(plan.days.at(-1).date, "2026-12-12");

const ids = new Set();
for (let index = 0; index < plan.days.length; index += 1) {
  const day = plan.days[index];
  if (index > 0) {
    const prior = new Date(`${plan.days[index - 1].date}T12:00:00Z`);
    prior.setUTCDate(prior.getUTCDate() + 1);
    assert.equal(day.date, prior.toISOString().slice(0, 10), `日期在 ${day.date} 前不连续`);
  }
  assert.equal(
    day.plannedMinutes,
    day.tasks.reduce((sum, task) => sum + task.minutes, 0),
    `${day.date} 任务分钟数之和不匹配`
  );
  for (const task of day.tasks) {
    assert.ok(!ids.has(task.id), `任务 ID 重复：${task.id}`);
    ids.add(task.id);
    assert.match(task.id, new RegExp(`^${day.date}-`));
  }
}

for (const date of ["2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"]) {
  const day = plan.days.find((item) => item.date === date);
  assert.equal(day.plannedMinutes, 0, `${date} 应完全休息`);
  assert.equal(day.tasks.length, 0, `${date} 不应有任何任务`);
}

for (const date of ["2026-11-12", "2026-11-13", "2026-11-14"]) {
  const day = plan.days.find((item) => item.date === date);
  assert.equal(day.tasks.length, 1, `${date} 运动会只保留一个任务`);
  assert.equal(day.tasks[0].kind, "word", `${date} 运动会只保留单词`);
  assert.ok(day.plannedMinutes <= 20, `${date} 运动会学习量不应超过 20 分钟`);
}

const learningDays = plan.days.filter((day) => day.tasks.some((task) => task.minutes > 0));
assert.equal(learningDays.length, 92, "应有 92 个学习日");
assert.equal(plan.examDateConfirmed, false, "考试日期仍应标记为待确认");

console.log(`Plan OK: ${plan.days.length} days, ${learningDays.length} learning days, ${ids.size} tasks.`);
