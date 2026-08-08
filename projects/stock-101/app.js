const STORAGE_KEY = 'stock101-progress-v1';
let activeLessonId = null;
let activeStep = 0;
let selectedOptionId = null;
let answerChecked = false;
let lastDialogFocus = null;

function defaultProgress() { return { completedLevels: [], answers: {}, currentLesson: null }; }
function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && Array.isArray(saved.completedLevels) ? { ...defaultProgress(), ...saved, answers: saved.answers || {} } : defaultProgress();
  } catch { return defaultProgress(); }
}
function saveProgress(progress) { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
function isUnlocked(index, progress) { return index === 0 || progress.completedLevels.includes(LEVELS[index - 1].id); }
function currentLesson() { return LESSONS[activeLessonId]; }
function availableLevels() { return LEVELS.filter(level => level.available); }

function suggestedLessonId() {
  const progress = loadProgress();
  if (progress.currentLesson?.lessonId && LESSONS[progress.currentLesson.lessonId] && !progress.completedLevels.includes(progress.currentLesson.lessonId)) return progress.currentLesson.lessonId;
  const nextLevel = availableLevels().find(level => !progress.completedLevels.includes(level.id));
  return nextLevel?.id || null;
}

function updatePrimaryActions() {
  const progress = loadProgress();
  const suggestion = suggestedLessonId();
  const hasCurrentLesson = progress.currentLesson?.lessonId === suggestion;
  document.querySelectorAll('[data-primary-start]').forEach(button => {
    if (suggestion) {
      button.dataset.startLevel = suggestion;
      button.textContent = hasCurrentLesson ? '继续上次学习' : progress.completedLevels.length ? '继续下一关' : '🎯 开始第一关';
    } else {
      delete button.dataset.startLevel;
      button.textContent = '查看学习成果';
    }
  });
}

function renderLevels() {
  const grid = document.querySelector('[data-level-grid]');
  const progress = loadProgress();
  const visibleLevels = availableLevels();
  grid.innerHTML = visibleLevels.map((level, index) => {
    const completed = progress.completedLevels.includes(level.id);
    const unlocked = isUnlocked(index, progress);
    const inProgress = progress.currentLesson?.lessonId === level.id && !completed;
    const state = completed ? '已完成' : inProgress ? '进行中' : unlocked ? '可开始' : '未解锁';
    const action = completed ? '重新训练 →' : inProgress ? '继续学习 →' : !unlocked ? '🔒 完成上一关后解锁' : '进入关卡 →';
    return `<article class="level-card fade-in ${unlocked ? '' : 'locked'}" style="animation-delay:${index * 0.1}s">
      <div class="level-topline"><span class="level-number">关卡 ${index + 1}</span><span class="level-state">${state}</span></div>
      <span class="card-icon" aria-hidden="true">${level.icon}</span><h3>${level.title}</h3><p>${level.description}</p>
      <div class="level-meta"><span>约 ${level.minutes} 分钟</span><span>${level.questions} 道训练题</span></div>
      ${unlocked ? `<button class="btn-text level-action" type="button" data-start-level="${level.id}">${action}</button>` : `<span class="level-action">${action}</span>`}
    </article>`;
  }).join('');
  const count = visibleLevels.filter(level => progress.completedLevels.includes(level.id)).length;
  document.querySelector('[data-progress-number]').textContent = `${count}/${visibleLevels.length}`;
  document.querySelector('[data-progress-bar]').style.width = `${count / visibleLevels.length * 100}%`;
  document.querySelector('[data-path-complete]').hidden = count !== visibleLevels.length;
  updatePrimaryActions();
}

function standardStep(step) {
  return `<p class="eyebrow">${step.eyebrow}</p><span class="lesson-icon" aria-hidden="true">${step.icon}</span><h2 id="lesson-title">${step.title}</h2>
    <div class="lesson-copy">${step.body.map(text => `<p>${text}</p>`).join('')}</div>
    ${step.callout ? `<div class="callout"><strong>💡 记住</strong><p>${step.callout}</p></div>` : ''}
    ${step.facts ? `<div class="fact-grid">${step.facts.map(fact => `<div><span class="stat-number">${fact.value}</span><span class="stat-label">${fact.label}</span></div>`).join('')}</div>` : ''}
    <div class="lesson-actions"><button class="btn-primary" type="button" data-next-step>继续 →</button></div>`;
}

function choiceQuestion(step) {
  const isCorrect = answerChecked && selectedOptionId === step.correctOptionId;
  const feedback = answerChecked ? (isCorrect ? step.feedback.correct : step.feedback.incorrect[selectedOptionId]) : '';
  return `<p class="eyebrow">${step.eyebrow}</p><h2 id="lesson-title">${step.title}</h2><p class="question-prompt">${step.prompt}</p>
    <fieldset class="option-list" ${answerChecked ? 'disabled' : ''}><legend class="sr-only">请选择一个答案</legend>${step.options.map((option, index) => `<label class="option-card ${selectedOptionId === option.id ? 'selected' : ''}"><input type="radio" name="lesson-answer" value="${option.id}" ${selectedOptionId === option.id ? 'checked' : ''}><span class="option-marker">${option.marker || String.fromCharCode(65 + index)}</span><span>${option.label}</span></label>`).join('')}</fieldset>
    ${answerChecked ? `<div class="answer-feedback ${isCorrect ? 'correct' : 'incorrect'}" role="status"><strong>${isCorrect ? '✓ 回答正确' : '再想一想'}</strong><p>${feedback}</p>${isCorrect ? `<div class="answer-explanation"><strong>正确答案解析</strong><p>${step.feedback.explanation}</p></div>` : ''}</div>` : ''}
    <div class="lesson-actions">${!answerChecked ? `<button class="btn-primary" type="button" data-check-answer ${selectedOptionId ? '' : 'disabled'}>提交答案</button>` : isCorrect ? `<button class="btn-primary" type="button" data-next-step>继续 →</button>` : `<button class="btn-ghost" type="button" data-retry-answer>重新选择</button>`}</div>`;
}

const TRAINING_RENDERERS = {
  singleChoice: choiceQuestion,
  trueFalse: choiceQuestion,
  simulatedTrade: null,
  candlestick: null
};

function completeStep(step) {
  return `<div class="completion"><p class="eyebrow">${step.eyebrow}</p><span class="lesson-icon" aria-hidden="true">${step.icon}</span><h2 id="lesson-title">${step.title}</h2><div class="achievement-card"><strong>你已经学会</strong><p>${step.achievement}</p></div><ul>${step.summary.map(item => `<li><span aria-hidden="true">✓</span>${item}</li>`).join('')}</ul><div class="callout"><strong>学习进度已保存</strong><p>${step.nextMessage}</p></div><div class="lesson-actions"><button class="btn-primary" type="button" data-complete-level>完成并返回地图</button></div></div>`;
}

function openResetDialog() {
  const dialog = document.querySelector('[data-reset-dialog]');
  lastDialogFocus = document.activeElement;
  dialog.hidden = false;
  document.querySelector('.dialog-actions [data-cancel-reset]').focus();
}

function closeResetDialog() {
  document.querySelector('[data-reset-dialog]').hidden = true;
  if (lastDialogFocus) lastDialogFocus.focus();
}

function saveCurrentStep() {
  const progress = loadProgress();
  progress.currentLesson = { lessonId: activeLessonId, stepIndex: activeStep, updatedAt: new Date().toISOString() };
  saveProgress(progress);
}

function recordCorrectAnswer(step) {
  const progress = loadProgress();
  progress.answers[step.id] = { lessonId: activeLessonId, questionType: step.questionType, correct: true, selectedOptionId, completedAt: new Date().toISOString() };
  saveProgress(progress);
}

function renderLessonStep() {
  const lesson = currentLesson();
  const step = lesson.steps[activeStep];
  const content = document.querySelector('[data-lesson-content]');
  document.querySelector('[data-lesson-step-label]').textContent = `${lesson.title} · 第 ${activeStep + 1} / ${lesson.steps.length} 步`;
  document.querySelector('[data-lesson-progress]').style.width = `${(activeStep + 1) / lesson.steps.length * 100}%`;
  content.innerHTML = step.type === 'question' ? TRAINING_RENDERERS[step.questionType](step) : step.type === 'complete' ? completeStep(step) : standardStep(step);
  content.focus({ preventScroll: true });
}

function openLesson(lessonId) {
  const progress = loadProgress();
  const resume = progress.currentLesson?.lessonId === lessonId && !progress.completedLevels.includes(lessonId);
  activeLessonId = lessonId;
  activeStep = resume ? Math.min(progress.currentLesson.stepIndex, LESSONS[lessonId].steps.length - 1) : 0;
  selectedOptionId = null; answerChecked = false;
  document.querySelector('[data-lesson-view]').hidden = false;
  document.body.classList.add('lesson-open');
  saveCurrentStep(); renderLessonStep(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeLesson() {
  if (activeLessonId) saveCurrentStep();
  document.querySelector('[data-lesson-view]').hidden = true;
  document.body.classList.remove('lesson-open');
  renderLevels(); document.querySelector('#path').scrollIntoView();
}

function nextStep() {
  const step = currentLesson().steps[activeStep];
  if (step.type === 'question') recordCorrectAnswer(step);
  activeStep += 1; selectedOptionId = null; answerChecked = false;
  saveCurrentStep(); renderLessonStep();
}

function finishLesson() {
  const progress = loadProgress();
  if (!progress.completedLevels.includes(activeLessonId)) progress.completedLevels.push(activeLessonId);
  progress.currentLesson = null;
  saveProgress(progress);
  document.querySelector('[data-lesson-view]').hidden = true;
  document.body.classList.remove('lesson-open');
  activeLessonId = null; renderLevels(); document.querySelector('#path').scrollIntoView();
}

function setupInteractions() {
  document.addEventListener('click', event => {
    const startButton = event.target.closest('[data-start-level]');
    if (startButton) openLesson(startButton.dataset.startLevel);
    if (event.target.closest('[data-close-lesson]')) closeLesson();
    if (event.target.closest('[data-next-step]')) nextStep();
    if (event.target.closest('[data-check-answer]') && selectedOptionId) { answerChecked = true; renderLessonStep(); }
    if (event.target.closest('[data-retry-answer]')) { selectedOptionId = null; answerChecked = false; renderLessonStep(); }
    if (event.target.closest('[data-complete-level]')) finishLesson();
    if (event.target.closest('[data-primary-start]') && !event.target.closest('[data-primary-start]').dataset.startLevel) document.querySelector('#path').scrollIntoView();
    if (event.target.closest('[data-reset-progress]')) openResetDialog();
    if (event.target.closest('[data-cancel-reset]')) closeResetDialog();
    if (event.target.closest('[data-confirm-reset]')) { localStorage.removeItem(STORAGE_KEY); closeResetDialog(); activeLessonId = null; document.querySelector('[data-lesson-view]').hidden = true; document.body.classList.remove('lesson-open'); renderLevels(); document.querySelector('#path').scrollIntoView(); }
  });
  document.addEventListener('change', event => {
    if (event.target.name === 'lesson-answer') { selectedOptionId = event.target.value; renderLessonStep(); }
  });
}

function setupNavigation() {
  const header = document.querySelector('[data-header]'); const button = document.querySelector('[data-menu-button]'); const links = document.querySelector('[data-nav-links]');
  window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 8));
  button.addEventListener('click', () => { const open = links.classList.toggle('open'); button.setAttribute('aria-expanded', String(open)); });
  links.addEventListener('click', () => { links.classList.remove('open'); button.setAttribute('aria-expanded', 'false'); });
}

function setupKeyboardInteractions() {
  document.addEventListener('keydown', event => {
    const dialog = document.querySelector('[data-reset-dialog]');
    const menuButton = document.querySelector('[data-menu-button]');
    const menu = document.querySelector('[data-nav-links]');
    if (event.key === 'Escape' && !dialog.hidden) { closeResetDialog(); return; }
    if (event.key === 'Escape' && menu.classList.contains('open')) { menu.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.focus(); return; }
    if (event.key === 'Escape' && !document.querySelector('[data-lesson-view]').hidden) { closeLesson(); return; }
    if (event.key === 'Tab' && !dialog.hidden) {
      const focusable = [...dialog.querySelectorAll('button:not([disabled])')];
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
}

renderLevels(); setupNavigation(); setupInteractions(); setupKeyboardInteractions();

