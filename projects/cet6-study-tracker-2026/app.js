(() => {
  "use strict";

  const plan = window.CET6_PLAN;
  if (!plan || !Array.isArray(plan.days) || plan.days.length === 0) {
    document.body.textContent = "计划数据加载失败，请联网刷新后重试。";
    return;
  }

  const STORAGE_KEY = `cet6-checkin:${plan.planVersion}`;
  const planByDate = new Map(plan.days.map((day) => [day.date, day]));
  const validTaskIds = new Map(
    plan.days.map((day) => [day.date, new Set(day.tasks.map((task) => task.id))])
  );
  const firstDate = plan.days[0].date;
  const lastDate = plan.days[plan.days.length - 1].date;
  const moduleLabels = {
    word: "单词",
    listening: "听力",
    reading: "阅读",
    writing: "写译",
    review: "复盘"
  };
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  const $ = (id) => document.getElementById(id);
  const elements = {
    contextBanner: $("context-banner"),
    previousDay: $("previous-day"),
    nextDay: $("next-day"),
    dateDisplay: $("date-display"),
    dateKicker: $("date-kicker"),
    todayHeading: $("today-heading"),
    backToday: $("back-today"),
    weekStrip: $("week-strip"),
    weekChip: $("week-chip"),
    dayTypeChip: $("day-type-chip"),
    dayDuration: $("day-duration"),
    progressCount: $("progress-count"),
    progressMinutes: $("progress-minutes"),
    progressBar: $("progress-bar"),
    taskList: $("task-list"),
    emptyDay: $("empty-day"),
    emptyTitle: $("empty-title"),
    emptyCopy: $("empty-copy"),
    dayDetails: $("day-details"),
    dayMaterial: $("day-material"),
    daySuccess: $("day-success"),
    completeDay: $("complete-day"),
    optionalRecord: $("optional-record"),
    actualMinutes: $("actual-minutes"),
    dayNote: $("day-note"),
    resetDay: $("reset-day"),
    calendarMonth: $("calendar-month"),
    calendarGrid: $("calendar-grid"),
    monthSummary: $("month-summary"),
    previousMonth: $("previous-month"),
    nextMonth: $("next-month"),
    completedDays: $("completed-days"),
    completedDaysTotal: $("completed-days-total"),
    completedTasks: $("completed-tasks"),
    completedTasksTotal: $("completed-tasks-total"),
    estimatedHours: $("estimated-hours"),
    currentWeekTitle: $("current-week-title"),
    currentWeekRate: $("current-week-rate"),
    currentWeekBar: $("current-week-bar"),
    currentWeekCopy: $("current-week-copy"),
    moduleProgress: $("module-progress"),
    nextMilestone: $("next-milestone"),
    settingsButton: $("settings-button"),
    settingsDialog: $("settings-dialog"),
    installButton: $("install-button"),
    installCopy: $("install-copy"),
    iosInstall: $("ios-install"),
    exportButton: $("export-button"),
    importFile: $("import-file"),
    backupStatus: $("backup-status"),
    resetAll: $("reset-all"),
    appStatus: $("app-status"),
    toast: $("toast"),
    toastMessage: $("toast-message"),
    toastAction: $("toast-action")
  };

  let storageAvailable = true;
  let storageDamage = null;
  let state = loadState();
  let selectedDate = initialSelectedDate();
  let calendarCursor = monthStart(selectedDate);
  let currentView = "today";
  let noteTimer = 0;
  let toastTimer = 0;
  let undoAction = null;
  let deferredInstallPrompt = null;
  let reloadOnControllerChange = false;

  function createDefaultState() {
    return {
      schemaVersion: 1,
      planVersion: plan.planVersion,
      updatedAt: null,
      days: {},
      settings: { lastBackupAt: null }
    };
  }

  function loadState() {
    const fallback = createDefaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return sanitizeState(parsed, false);
    } catch (error) {
      storageDamage = error;
      return fallback;
    }
  }

  function sanitizeState(input, strictImport) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("备份格式不正确");
    }
    if (Number(input.schemaVersion) !== 1 || input.planVersion !== plan.planVersion) {
      throw new Error("备份版本与当前计划不一致");
    }

    const clean = createDefaultState();
    const sourceDays = input.days && typeof input.days === "object" && !Array.isArray(input.days)
      ? input.days
      : {};
    const dayEntries = Object.entries(sourceDays);
    if (strictImport && dayEntries.length > plan.days.length) {
      throw new Error("备份包含过多日期记录");
    }

    for (const [date, sourceDay] of dayEntries) {
      if (!planByDate.has(date) || !sourceDay || typeof sourceDay !== "object" || Array.isArray(sourceDay)) {
        if (strictImport) throw new Error(`备份中的日期无效：${date}`);
        continue;
      }
      const cleanDay = { tasks: {} };
      const sourceTasks = sourceDay.tasks && typeof sourceDay.tasks === "object" && !Array.isArray(sourceDay.tasks)
        ? sourceDay.tasks
        : {};
      for (const [taskId, sourceTask] of Object.entries(sourceTasks)) {
        if (!validTaskIds.get(date).has(taskId)) {
          if (strictImport) throw new Error("备份含有无法识别的任务");
          continue;
        }
        if (sourceTask && typeof sourceTask === "object" && sourceTask.done === true) {
          cleanDay.tasks[taskId] = {
            done: true,
            completedAt: typeof sourceTask.completedAt === "string"
              ? sourceTask.completedAt.slice(0, 40)
              : null
          };
        }
      }
      if (sourceDay.actualMinutes !== undefined && sourceDay.actualMinutes !== "") {
        const minutes = Number(sourceDay.actualMinutes);
        if (!Number.isInteger(minutes) || minutes < 0 || minutes > 600) {
          if (strictImport) throw new Error("实际用时必须是 0–600 的整数");
        } else {
          cleanDay.actualMinutes = minutes;
        }
      }
      if (sourceDay.note !== undefined) {
        if (typeof sourceDay.note !== "string" || sourceDay.note.length > 240) {
          if (strictImport) throw new Error("备注格式不正确或超过 240 字");
        } else {
          cleanDay.note = sourceDay.note;
        }
      }
      if (Object.keys(cleanDay.tasks).length || cleanDay.actualMinutes !== undefined || cleanDay.note) {
        clean.days[date] = cleanDay;
      }
    }

    clean.updatedAt = typeof input.updatedAt === "string" ? input.updatedAt.slice(0, 40) : null;
    if (input.settings && typeof input.settings.lastBackupAt === "string") {
      clean.settings.lastBackupAt = input.settings.lastBackupAt.slice(0, 40);
    }
    return clean;
  }

  function saveState(options = {}) {
    state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageAvailable = true;
      updateBackupStatus();
      if (options.toast) showToast(options.toast);
      return true;
    } catch (error) {
      storageAvailable = false;
      showToast("浏览器未能保存，请先导出备份");
      return false;
    }
  }

  function getBeijingToday() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function initialSelectedDate() {
    const params = new URLSearchParams(location.search);
    const requested = params.get("date");
    if (requested && planByDate.has(requested)) return requested;
    const today = getBeijingToday();
    if (today < firstDate) return firstDate;
    if (today > lastDate) return lastDate;
    return planByDate.has(today) ? today : firstDate;
  }

  function localDate(dateKey) {
    return new Date(`${dateKey}T12:00:00`);
  }

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatShortDate(date) {
    return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
  }

  function formatFullDate(key) {
    const date = localDate(key);
    return `${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${weekdays[date.getDay()]}`;
  }

  function formatBackupTime(value) {
    if (!value) return "还没有导出过备份";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "已导出过备份";
    return `上次导出：${date.toLocaleString("zh-CN", { hour12: false })}`;
  }

  function addDays(key, amount) {
    const date = localDate(key);
    date.setDate(date.getDate() + amount);
    return dateKey(date);
  }

  function monthStart(key) {
    const date = localDate(key);
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  }

  function getDayRecord(date, create = false) {
    if (!state.days[date] && create) state.days[date] = { tasks: {} };
    return state.days[date] || { tasks: {} };
  }

  function isTaskDone(date, taskId) {
    return getDayRecord(date).tasks?.[taskId]?.done === true;
  }

  function activeTasks(day) {
    return day.tasks.filter((task) => task.minutes > 0);
  }

  function dayStats(day) {
    const tasks = activeTasks(day);
    const doneTasks = tasks.filter((task) => isTaskDone(day.date, task.id));
    return {
      total: tasks.length,
      done: doneTasks.length,
      totalMinutes: tasks.reduce((sum, task) => sum + task.minutes, 0),
      doneMinutes: doneTasks.reduce((sum, task) => sum + task.minutes, 0)
    };
  }

  function dayStatus(day) {
    const stats = dayStats(day);
    if (stats.total === 0) return "rest";
    if (stats.done === stats.total) return "complete";
    if (stats.done > 0) return "partial";
    return "pending";
  }

  function statusText(status) {
    return { complete: "已完成", partial: "部分完成", pending: "未开始", rest: "休息或占位" }[status];
  }

  function setTaskDone(date, taskId, done, quiet = false) {
    const day = planByDate.get(date);
    if (!day || !validTaskIds.get(date).has(taskId)) return;
    const record = getDayRecord(date, true);
    if (!record.tasks) record.tasks = {};
    if (done) {
      record.tasks[taskId] = { done: true, completedAt: new Date().toISOString() };
    } else {
      delete record.tasks[taskId];
    }
    pruneDay(date);
    saveState();
    if (!quiet && navigator.vibrate) navigator.vibrate(18);
  }

  function pruneDay(date) {
    const record = state.days[date];
    if (!record) return;
    const hasTasks = record.tasks && Object.keys(record.tasks).length > 0;
    const hasMinutes = record.actualMinutes !== undefined;
    const hasNote = Boolean(record.note);
    if (!hasTasks && !hasMinutes && !hasNote) delete state.days[date];
  }

  function renderAll() {
    renderToday();
    renderCalendar();
    renderProgress();
    updateBackupStatus();
  }

  function renderToday() {
    const day = planByDate.get(selectedDate);
    const stats = dayStats(day);
    const today = getBeijingToday();
    elements.dateKicker.textContent = selectedDate === today ? "今天" : `第 ${day.week} 周 · ${day.phase}`;
    elements.todayHeading.textContent = formatFullDate(selectedDate);
    elements.dateDisplay.setAttribute("aria-label", `当前 ${formatFullDate(selectedDate)}，点按查看日历`);
    elements.previousDay.disabled = selectedDate === firstDate;
    elements.nextDay.disabled = selectedDate === lastDate;
    elements.backToday.hidden = selectedDate === clampedToday();
    elements.weekChip.textContent = `第 ${day.week} 周 · ${day.phase}`;
    elements.dayTypeChip.textContent = day.dayType;
    elements.dayTypeChip.className = "chip chip-accent";
    if (/旅行|中秋|运动会|轻量|弹性/.test(day.dayType)) elements.dayTypeChip.classList.add("is-light");
    if (stats.total === 0) elements.dayTypeChip.classList.add("is-rest");
    if (/考试/.test(day.dayType)) elements.dayTypeChip.classList.add("is-exam");
    elements.dayDuration.textContent = day.plannedMinutes ? `预计 ${day.plannedMinutes} 分钟` : "按计划不学习";

    const percent = stats.total ? Math.round((stats.done / stats.total) * 100) : 100;
    elements.progressCount.textContent = `${stats.done}/${stats.total} 项`;
    elements.progressMinutes.textContent = `${stats.doneMinutes} / ${stats.totalMinutes} 分钟`;
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.parentElement.setAttribute("aria-valuenow", String(percent));

    renderTaskList(day);
    elements.dayMaterial.textContent = day.material;
    elements.daySuccess.textContent = day.success;
    elements.dayDetails.hidden = !day.material && !day.success;
    elements.completeDay.hidden = stats.total === 0;
    elements.completeDay.disabled = stats.total > 0 && stats.done === stats.total;
    elements.completeDay.classList.toggle("is-complete", stats.total > 0 && stats.done === stats.total);
    elements.completeDay.textContent = stats.done === stats.total && stats.total > 0 ? "今日已完成 ✓" : "一键完成今日";
    elements.optionalRecord.hidden = stats.total === 0;

    const record = getDayRecord(selectedDate);
    elements.actualMinutes.value = record.actualMinutes ?? "";
    elements.dayNote.value = record.note || "";
    renderWeekStrip(day);
    renderContextBanner(today, day);
    updateQueryDate();
  }

  function renderTaskList(day) {
    elements.taskList.replaceChildren();
    const active = activeTasks(day);
    elements.emptyDay.hidden = active.length > 0;
    if (active.length === 0) {
      const isExam = /考试/.test(day.dayType);
      elements.emptyTitle.textContent = isExam ? "考试日不安排额外学习" : "今天按计划休息";
      elements.emptyCopy.textContent = isExam
        ? "日期尚待官方确认；当天只带好用品、正常赴考。"
        : "这一天不计欠账，也不需要之后补做。好好旅行和休息。";
    }

    for (const task of day.tasks) {
      if (task.minutes <= 0) {
        const item = document.createElement("div");
        item.className = "task-item is-info";
        const icon = document.createElement("span");
        icon.className = "info-visual";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "i";
        const copy = taskCopy(task);
        item.append(icon, copy);
        elements.taskList.append(item);
        continue;
      }

      const label = document.createElement("label");
      label.className = "task-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "task-check";
      input.checked = isTaskDone(day.date, task.id);
      input.setAttribute("aria-label", `${task.label}：${task.text}`);
      label.classList.toggle("is-done", input.checked);

      const visual = document.createElement("span");
      visual.className = "check-visual";
      visual.setAttribute("aria-hidden", "true");
      visual.append(checkSvg());
      const copy = taskCopy(task);
      const minutes = document.createElement("span");
      minutes.className = "task-minutes";
      minutes.textContent = `${task.minutes} 分钟`;
      input.addEventListener("change", () => {
        setTaskDone(day.date, task.id, input.checked);
        renderAll();
        showToast(input.checked ? `${task.label}已打卡，已自动保存` : `${task.label}已取消`);
      });
      label.append(input, visual, copy, minutes);
      elements.taskList.append(label);
    }
  }

  function taskCopy(task) {
    const copy = document.createElement("span");
    copy.className = "task-copy";
    const title = document.createElement("strong");
    title.textContent = task.label;
    const text = document.createElement("p");
    text.textContent = task.text;
    copy.append(title, text);
    return copy;
  }

  function checkSvg() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M5 12.5 9.2 17 19 7");
    svg.append(path);
    return svg;
  }

  function renderWeekStrip(day) {
    elements.weekStrip.replaceChildren();
    const selected = localDate(day.date);
    const mondayOffset = (selected.getDay() + 6) % 7;
    const monday = addDays(day.date, -mondayOffset);
    for (let i = 0; i < 7; i += 1) {
      const key = addDays(monday, i);
      const planDay = planByDate.get(key);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "week-day";
      button.disabled = !planDay;
      button.classList.toggle("is-selected", key === selectedDate);
      const weekLabel = document.createElement("span");
      weekLabel.textContent = ["一", "二", "三", "四", "五", "六", "日"][i];
      const dateLabel = document.createElement("strong");
      dateLabel.textContent = localDate(key).getDate();
      button.append(weekLabel, dateLabel);
      if (planDay) {
        const status = dayStatus(planDay);
        const dot = document.createElement("i");
        dot.className = `week-day-status ${status}`;
        dot.setAttribute("aria-hidden", "true");
        button.append(dot);
        button.setAttribute("aria-label", `${formatFullDate(key)}，${statusText(status)}`);
        button.addEventListener("click", () => selectDate(key));
      }
      elements.weekStrip.append(button);
    }
  }

  function renderContextBanner(today, day) {
    let message = "";
    if (storageDamage) {
      message = "发现本机旧记录损坏，已暂停读取。请在设置里导出新备份或清空后重新开始。";
    } else if (!storageAvailable) {
      message = "当前浏览器无法保存记录，请检查隐私模式或先导出备份。";
    } else if (today < firstDate) {
      const days = Math.max(0, Math.round((localDate(firstDate) - localDate(today)) / 86400000));
      message = `计划 ${formatShortDate(localDate(firstDate))} 开始，还有 ${days} 天。现在可以先浏览，不必提前打卡。`;
    } else if (selectedDate > today) {
      message = "正在查看未来计划；可以预览，但不用提前完成。";
    } else if (/旅行/.test(day.dayType)) {
      message = day.plannedMinutes === 0 ? "新加坡旅行休息日：完全留空，不欠任务。" : "旅行轻量日：完成词汇即可，没完成也不顺延。";
    } else if (/运动会/.test(day.dayType)) {
      message = "运动会轻量日：只保留单词，不安排补课。";
    }
    elements.contextBanner.hidden = !message;
    elements.contextBanner.textContent = message;
  }

  function clampedToday() {
    const today = getBeijingToday();
    if (today < firstDate) return firstDate;
    if (today > lastDate) return lastDate;
    return planByDate.has(today) ? today : firstDate;
  }

  function selectDate(key) {
    if (!planByDate.has(key)) return;
    flushOptionalRecord();
    selectedDate = key;
    calendarCursor = monthStart(key);
    renderAll();
  }

  function updateQueryDate() {
    try {
      const url = new URL(location.href);
      url.searchParams.set("date", selectedDate);
      history.replaceState(null, "", url);
    } catch (_) {
      // The app remains usable if URL rewriting is unavailable.
    }
  }

  function renderCalendar() {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    elements.calendarMonth.textContent = `${year} 年 ${month + 1} 月`;
    const minMonth = monthStart(firstDate);
    const maxMonth = monthStart(lastDate);
    elements.previousMonth.disabled = calendarCursor <= minMonth;
    elements.nextMonth.disabled = calendarCursor >= maxMonth;
    elements.calendarGrid.replaceChildren();

    const firstWeekday = (new Date(year, month, 1, 12).getDay() + 6) % 7;
    for (let i = 0; i < firstWeekday; i += 1) {
      const blank = document.createElement("span");
      blank.className = "calendar-blank";
      elements.calendarGrid.append(blank);
    }
    const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
    const monthDays = [];
    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const key = dateKey(new Date(year, month, dayNumber, 12));
      const planDay = planByDate.get(key);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-day";
      if (!planDay) {
        button.disabled = true;
      } else {
        monthDays.push(planDay);
        const status = dayStatus(planDay);
        button.classList.toggle("is-selected", key === selectedDate);
        button.classList.toggle("is-today", key === getBeijingToday());
        button.classList.toggle("is-special", !/工作日|周末/.test(planDay.dayType));
        button.setAttribute("aria-label", `${formatFullDate(key)}，${planDay.dayType}，${statusText(status)}`);
        button.addEventListener("click", () => {
          selectDate(key);
          switchView("today");
        });
        const dot = document.createElement("i");
        dot.className = `status-dot ${status}`;
        dot.setAttribute("aria-hidden", "true");
        button.append(dot);
      }
      const number = document.createElement("span");
      number.className = "calendar-day-number";
      number.textContent = String(dayNumber);
      button.prepend(number);
      elements.calendarGrid.append(button);
    }

    const learningDays = monthDays.filter((day) => activeTasks(day).length > 0);
    const completed = learningDays.filter((day) => dayStatus(day) === "complete").length;
    const rest = monthDays.length - learningDays.length;
    elements.monthSummary.textContent = `本月完成 ${completed}/${learningDays.length} 个学习日 · ${rest} 天休息/占位`;
  }

  function renderProgress() {
    const learningDays = plan.days.filter((day) => activeTasks(day).length > 0);
    const allTasks = plan.days.flatMap((day) => activeTasks(day).map((task) => ({ ...task, date: day.date })));
    const completedDayCount = learningDays.filter((day) => dayStatus(day) === "complete").length;
    const completedTaskList = allTasks.filter((task) => isTaskDone(task.date, task.id));
    const doneMinutes = completedTaskList.reduce((sum, task) => sum + task.minutes, 0);
    elements.completedDays.textContent = String(completedDayCount);
    elements.completedDaysTotal.textContent = `共 ${learningDays.length} 天`;
    elements.completedTasks.textContent = String(completedTaskList.length);
    elements.completedTasksTotal.textContent = `共 ${allTasks.length} 项`;
    elements.estimatedHours.textContent = `${(doneMinutes / 60).toFixed(doneMinutes % 60 ? 1 : 0)}h`;

    const anchorDay = planByDate.get(clampedToday()) || plan.days[0];
    const weekDays = plan.days.filter((day) => day.week === anchorDay.week && activeTasks(day).length > 0);
    const weekTasks = weekDays.flatMap((day) => activeTasks(day).map((task) => ({ ...task, date: day.date })));
    const weekDone = weekTasks.filter((task) => isTaskDone(task.date, task.id)).length;
    const weekRate = weekTasks.length ? Math.round((weekDone / weekTasks.length) * 100) : 0;
    elements.currentWeekTitle.textContent = `第 ${anchorDay.week} 周 · ${anchorDay.phase}`;
    elements.currentWeekRate.textContent = `${weekRate}%`;
    elements.currentWeekBar.style.width = `${weekRate}%`;
    elements.currentWeekBar.parentElement.setAttribute("aria-valuenow", String(weekRate));
    elements.currentWeekCopy.textContent = `本周已完成 ${weekDone}/${weekTasks.length} 项；旅行和休息日不计欠账。`;

    elements.moduleProgress.replaceChildren();
    for (const kind of ["word", "listening", "reading", "writing", "review"]) {
      const tasks = allTasks.filter((task) => task.kind === kind);
      const done = tasks.filter((task) => isTaskDone(task.date, task.id)).length;
      const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      const row = document.createElement("div");
      row.className = "module-row";
      const label = document.createElement("strong");
      label.textContent = moduleLabels[kind];
      const count = document.createElement("span");
      count.textContent = `${done}/${tasks.length}`;
      const bar = document.createElement("span");
      bar.className = "module-bar";
      const fill = document.createElement("i");
      fill.style.width = `${rate}%`;
      bar.append(fill);
      row.append(label, count, bar);
      elements.moduleProgress.append(row);
    }

    elements.nextMilestone.replaceChildren();
    const today = getBeijingToday();
    const milestone = plan.days.find((day) => day.date >= today && /全真模考|考试日/.test(day.dayType))
      || plan.days.find((day) => /全真模考|考试日/.test(day.dayType));
    const title = document.createElement("strong");
    const copy = document.createElement("span");
    if (milestone) {
      title.textContent = `${formatFullDate(milestone.date)} · ${milestone.dayType}`;
      copy.textContent = milestone.success;
    } else {
      title.textContent = "暂无关键节点";
      copy.textContent = "继续按今天的任务推进即可。";
    }
    elements.nextMilestone.append(title, copy);
  }

  function switchView(target) {
    currentView = target;
    document.querySelectorAll(".view").forEach((view) => {
      const active = view.dataset.view === target;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    });
    document.querySelectorAll(".nav-button").forEach((button) => {
      const active = button.dataset.target === target;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (target === "calendar") renderCalendar();
    if (target === "progress") renderProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function completeSelectedDay() {
    const day = planByDate.get(selectedDate);
    const tasks = activeTasks(day);
    const previous = tasks.map((task) => ({ id: task.id, done: isTaskDone(day.date, task.id) }));
    tasks.forEach((task) => setTaskDone(day.date, task.id, true, true));
    renderAll();
    if (navigator.vibrate) navigator.vibrate([20, 35, 20]);
    showToast("今日任务已全部完成并保存", "撤销", () => {
      previous.forEach((item) => setTaskDone(day.date, item.id, item.done, true));
      renderAll();
      showToast("已撤销一键完成");
    });
  }

  function scheduleOptionalSave() {
    clearTimeout(noteTimer);
    noteTimer = window.setTimeout(flushOptionalRecord, 450);
  }

  function flushOptionalRecord() {
    clearTimeout(noteTimer);
    const day = planByDate.get(selectedDate);
    if (!day || activeTasks(day).length === 0) return;
    const record = getDayRecord(selectedDate, true);
    if (!record.tasks) record.tasks = {};
    const value = elements.actualMinutes.value.trim();
    if (value === "") {
      delete record.actualMinutes;
    } else {
      const minutes = Math.min(600, Math.max(0, Math.round(Number(value) || 0)));
      record.actualMinutes = minutes;
      if (String(minutes) !== value) elements.actualMinutes.value = String(minutes);
    }
    const note = elements.dayNote.value.slice(0, 240);
    if (note) record.note = note;
    else delete record.note;
    pruneDay(selectedDate);
    saveState();
  }

  function resetSelectedDay() {
    if (!state.days[selectedDate]) {
      showToast("当天还没有记录");
      return;
    }
    if (!confirm(`确定清空 ${formatFullDate(selectedDate)} 的打卡、用时和备注吗？`)) return;
    delete state.days[selectedDate];
    saveState();
    renderAll();
    showToast("当天记录已清空");
  }

  function showToast(message, actionLabel = "", action = null) {
    clearTimeout(toastTimer);
    undoAction = action;
    elements.toastMessage.textContent = message;
    elements.toastAction.hidden = !actionLabel;
    elements.toastAction.textContent = actionLabel;
    elements.toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      elements.toast.hidden = true;
      undoAction = null;
    }, action ? 5000 : 2200);
  }

  function updateBackupStatus() {
    elements.backupStatus.textContent = formatBackupTime(state.settings?.lastBackupAt);
  }

  function exportBackup() {
    flushOptionalRecord();
    state.settings.lastBackupAt = new Date().toISOString();
    saveState();
    const payload = {
      ...state,
      exportedAt: new Date().toISOString(),
      warning: "备份可能包含个人备注，请勿公开上传。"
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cet6-checkin-backup-${getBeijingToday()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    updateBackupStatus();
    showToast("备份已下载，请妥善保存");
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error("备份文件过大");
      const parsed = JSON.parse(await file.text());
      const imported = sanitizeState(parsed, true);
      if (!confirm("恢复后会替换当前手机上的全部打卡记录，确定继续吗？")) return;
      state = imported;
      storageDamage = null;
      if (!saveState()) throw new Error("浏览器无法保存恢复后的记录");
      renderAll();
      showToast("备份已恢复");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "备份恢复失败");
    } finally {
      elements.importFile.value = "";
    }
  }

  function resetAllRecords() {
    if (!confirm("确定清空全部打卡记录吗？此操作无法撤销，建议先导出备份。")) return;
    state = createDefaultState();
    storageDamage = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      storageAvailable = false;
    }
    renderAll();
    showToast("全部记录已清空");
  }

  function changeMonth(amount) {
    const next = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + amount, 1, 12);
    const min = monthStart(firstDate);
    const max = monthStart(lastDate);
    if (next < min || next > max) return;
    calendarCursor = next;
    renderCalendar();
  }

  function configureInstallExperience() {
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (standalone) {
      elements.installButton.hidden = true;
      elements.installCopy.textContent = "已经安装到主屏幕，可以像 App 一样直接打开。";
    } else if (ios) {
      elements.installButton.hidden = true;
      elements.iosInstall.hidden = false;
      elements.installCopy.textContent = "iPhone 请按下面 3 步添加；之后可从桌面直接进入。";
    }
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      elements.installButton.hidden = false;
      elements.installButton.disabled = false;
    });
    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      elements.installButton.hidden = true;
      elements.installCopy.textContent = "已安装到主屏幕。";
      showToast("已安装，可以从手机桌面打开");
    });
  }

  async function installApp() {
    if (!deferredInstallPrompt) {
      elements.iosInstall.hidden = false;
      elements.installCopy.textContent = "如果浏览器没有弹出安装，请打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。";
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) {
      elements.appStatus.textContent = "自动保存 · 浏览器打开即可打卡";
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
      await navigator.serviceWorker.ready;
      elements.appStatus.textContent = "自动保存 · 已可离线使用";

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker || !navigator.serviceWorker.controller) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") {
            showToast("发现新版本", "刷新", () => {
              reloadOnControllerChange = true;
              worker.postMessage({ type: "SKIP_WAITING" });
            });
          }
        });
      });
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloadOnControllerChange) location.reload();
      }, { once: true });
    } catch (_) {
      elements.appStatus.textContent = "自动保存 · 离线功能暂不可用";
    }
  }

  function bindEvents() {
    elements.previousDay.addEventListener("click", () => selectDate(addDays(selectedDate, -1)));
    elements.nextDay.addEventListener("click", () => selectDate(addDays(selectedDate, 1)));
    elements.backToday.addEventListener("click", () => selectDate(clampedToday()));
    elements.dateDisplay.addEventListener("click", () => switchView("calendar"));
    elements.completeDay.addEventListener("click", completeSelectedDay);
    elements.actualMinutes.addEventListener("input", scheduleOptionalSave);
    elements.dayNote.addEventListener("input", scheduleOptionalSave);
    elements.resetDay.addEventListener("click", resetSelectedDay);
    elements.previousMonth.addEventListener("click", () => changeMonth(-1));
    elements.nextMonth.addEventListener("click", () => changeMonth(1));
    document.querySelectorAll(".nav-button").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.target));
    });
    elements.settingsButton.addEventListener("click", () => elements.settingsDialog.showModal());
    elements.installButton.addEventListener("click", installApp);
    elements.exportButton.addEventListener("click", exportBackup);
    elements.importFile.addEventListener("change", () => importBackup(elements.importFile.files?.[0]));
    elements.resetAll.addEventListener("click", resetAllRecords);
    elements.toastAction.addEventListener("click", () => {
      const action = undoAction;
      elements.toast.hidden = true;
      undoAction = null;
      if (action) action();
    });
    window.addEventListener("pagehide", flushOptionalRecord);
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY) return;
      try {
        state = event.newValue ? sanitizeState(JSON.parse(event.newValue), false) : createDefaultState();
        renderAll();
        showToast("已同步本浏览器另一标签页的记录");
      } catch (_) {
        showToast("另一标签页的记录无法读取");
      }
    });
  }

  bindEvents();
  configureInstallExperience();
  renderAll();
  registerServiceWorker();
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

  window.__CET6_TRACKER__ = {
    storageKey: STORAGE_KEY,
    getState: () => JSON.parse(JSON.stringify(state)),
    getSelectedDate: () => selectedDate,
    selectDate,
    dayStatus: (date) => dayStatus(planByDate.get(date))
  };
})();
