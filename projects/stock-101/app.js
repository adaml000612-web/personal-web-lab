const LEVELS = [
  { id: 'stock', icon: '🏢', title: '股票究竟是什么', description: '理解买入股票代表拥有一家公司的部分所有权。', minutes: 6, questions: 1, available: true },
  { id: 'price', icon: '⚖️', title: '价格为什么变化', description: '认识买卖、信息和市场预期如何共同影响价格。', minutes: 7, questions: 3 },
  { id: 'market-cap', icon: '🏷️', title: '股价不等于公司大小', description: '用股价和总股数理解市值，避开常见比较误区。', minutes: 7, questions: 3 },
  { id: 'returns', icon: '🌿', title: '收益与风险从哪里来', description: '理解价差、分红、波动和永久损失的区别。', minutes: 8, questions: 3 },
  { id: 'candles', icon: '🕯️', title: '读懂第一根 K 线', description: '从模拟数据认识开盘、收盘、最高和最低价格。', minutes: 8, questions: 3 },
  { id: 'diversification', icon: '🧺', title: '在模拟市场管理风险', description: '通过虚构公司事件比较集中与分散持有的差异。', minutes: 10, questions: 3 }
];

const FIRST_LESSON = {
  id: 'stock',
  title: '股票究竟是什么',
  steps: [
    { type: 'concept', eyebrow: '知识点', title: '一张股票，代表一小部分所有权', icon: '🏢', body: ['公司为了筹集发展资金，可以把所有权分成许多小份。每一份就是一股。', '当你买入一家公司的股票，你买到的不是屏幕上的数字，而是这家公司的一小部分所有权。'], callout: '股东可能分享公司成长带来的价值，也要承担公司经营不佳和股价下跌的风险。' },
    { type: 'case', eyebrow: '案例', title: '一起开一家面包店', icon: '🥖', body: ['小林的面包店价值 100 万元。她把所有权平均分成 10 万股，那么每股对应面包店十万分之一的所有权。', '你买入 1,000 股后，就持有这家虚构面包店 1% 的股份。你没有买到一袋面包，也不是把钱借给面包店。'], facts: [{ value: '100 万', label: '公司价值' }, { value: '10 万股', label: '总股数' }, { value: '1%', label: '持有比例' }] },
    { type: 'question', id: 'stock-ownership-01', questionType: 'singleChoice', eyebrow: '互动问题', title: '买入股票后，你真正获得了什么？', prompt: '假设你买入了“暖阳面包店”的一部分股票。下面哪项描述最准确？', options: [{ id: 'a', label: '面包店必须按固定日期归还你的本金' }, { id: 'b', label: '你拥有了面包店的一小部分所有权' }, { id: 'c', label: '你获得了每天免费领取面包的权利' }], correctOptionId: 'b', feedback: { correct: '答对了。股票代表公司所有权的一部分，你成为了股东。', incorrect: { a: '这更像借款。股票没有固定还本日期，股东承担企业经营风险。', c: '股票不等于获得公司产品。股东拥有的是公司的一部分所有权。' }, explanation: '买入股票意味着取得公司的一部分所有权。股东可能从公司成长和分红中受益，也可能因经营不佳或市场价格变化而亏损。' } },
    { type: 'complete', eyebrow: '本关完成', title: '你已经抓住了股票的核心', icon: '🌱', summary: ['股票不是一张彩票，而是一小部分公司所有权。', '股东既有机会分享公司成长，也必须承担风险。', '股票和借款不同，公司不会承诺固定归还本金。'] }
  ]
};

const STORAGE_KEY = 'stock101-progress-v1';
let activeStep = 0;
let selectedOptionId = null;
let answerChecked = false;

function defaultProgress() { return { completedLevels: [], answers: {} }; }
function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && Array.isArray(saved.completedLevels) ? { ...defaultProgress(), ...saved } : defaultProgress();
  } catch { return defaultProgress(); }
}
function saveProgress(progress) { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
function isUnlocked(index, progress) { return index === 0 || progress.completedLevels.includes(LEVELS[index - 1].id); }

function renderLevels() {
  const grid = document.querySelector('[data-level-grid]');
  const progress = loadProgress();
  grid.innerHTML = LEVELS.map((level, index) => {
    const completed = progress.completedLevels.includes(level.id);
    const unlocked = isUnlocked(index, progress);
    const state = completed ? '已完成' : unlocked ? '可开始' : '未解锁';
    const action = completed ? '重新训练 →' : !unlocked ? '🔒 完成上一关后解锁' : level.available ? '进入关卡 →' : '已解锁 · 即将开放';
    return `<article class="level-card fade-in ${unlocked ? '' : 'locked'}" style="animation-delay:${index * 0.1}s">
      <div class="level-topline"><span class="level-number">关卡 ${index + 1}</span><span class="level-state">${state}</span></div>
      <span class="card-icon" aria-hidden="true">${level.icon}</span><h3>${level.title}</h3><p>${level.description}</p>
      <div class="level-meta"><span>约 ${level.minutes} 分钟</span><span>${level.questions} 道训练题</span></div>
      ${unlocked && level.available ? `<button class="btn-text level-action" type="button" data-start-level="${level.id}">${action}</button>` : `<span class="level-action">${action}</span>`}
    </article>`;
  }).join('');
  const count = progress.completedLevels.length;
  document.querySelector('[data-progress-number]').textContent = `${count}/${LEVELS.length}`;
  document.querySelector('[data-progress-bar]').style.width = `${count / LEVELS.length * 100}%`;
}

function standardStep(step) {
  return `<p class="eyebrow">${step.eyebrow}</p><span class="lesson-icon" aria-hidden="true">${step.icon}</span><h2 id="lesson-title">${step.title}</h2>
    <div class="lesson-copy">${step.body.map(text => `<p>${text}</p>`).join('')}</div>
    ${step.callout ? `<div class="callout"><strong>💡 记住</strong><p>${step.callout}</p></div>` : ''}
    ${step.facts ? `<div class="fact-grid">${step.facts.map(fact => `<div><span class="stat-number">${fact.value}</span><span class="stat-label">${fact.label}</span></div>`).join('')}</div>` : ''}
    <div class="lesson-actions"><button class="btn-primary" type="button" data-next-step>继续 →</button></div>`;
}

const TRAINING_RENDERERS = {
  singleChoice(step) {
    const feedback = answerChecked ? (selectedOptionId === step.correctOptionId ? step.feedback.correct : step.feedback.incorrect[selectedOptionId]) : '';
    const isCorrect = answerChecked && selectedOptionId === step.correctOptionId;
    return `<p class="eyebrow">${step.eyebrow}</p><h2 id="lesson-title">${step.title}</h2><p class="question-prompt">${step.prompt}</p>
      <fieldset class="option-list" ${answerChecked ? 'disabled' : ''}><legend class="sr-only">请选择一个答案</legend>${step.options.map(option => `<label class="option-card ${selectedOptionId === option.id ? 'selected' : ''}"><input type="radio" name="lesson-answer" value="${option.id}" ${selectedOptionId === option.id ? 'checked' : ''}><span class="option-marker">${option.id.toUpperCase()}</span><span>${option.label}</span></label>`).join('')}</fieldset>
      ${answerChecked ? `<div class="answer-feedback ${isCorrect ? 'correct' : 'incorrect'}" role="status"><strong>${isCorrect ? '✓ 回答正确' : '再想一想'}</strong><p>${feedback}</p>${isCorrect ? `<div class="answer-explanation"><strong>正确答案解析</strong><p>${step.feedback.explanation}</p></div>` : ''}</div>` : ''}
      <div class="lesson-actions">${!answerChecked ? `<button class="btn-primary" type="button" data-check-answer ${selectedOptionId ? '' : 'disabled'}>提交答案</button>` : isCorrect ? `<button class="btn-primary" type="button" data-next-step>查看本关总结 →</button>` : `<button class="btn-ghost" type="button" data-retry-answer>重新选择</button>`}</div>`;
  },
  trueFalse: null,
  simulatedTrade: null,
  candlestick: null
};

function completeStep(step) {
  return `<div class="completion"><p class="eyebrow">${step.eyebrow}</p><span class="lesson-icon" aria-hidden="true">${step.icon}</span><h2 id="lesson-title">${step.title}</h2><ul>${step.summary.map(item => `<li><span aria-hidden="true">✓</span>${item}</li>`).join('')}</ul><div class="callout"><strong>下一关已解锁</strong><p>回到地图后，你会看到“价格为什么变化”已经可以开始。</p></div><div class="lesson-actions"><button class="btn-primary" type="button" data-complete-level>完成并返回地图</button></div></div>`;
}

function renderLessonStep() {
  const step = FIRST_LESSON.steps[activeStep];
  const content = document.querySelector('[data-lesson-content]');
  document.querySelector('[data-lesson-step-label]').textContent = `第 ${activeStep + 1} / ${FIRST_LESSON.steps.length} 步`;
  document.querySelector('[data-lesson-progress]').style.width = `${(activeStep + 1) / FIRST_LESSON.steps.length * 100}%`;
  content.innerHTML = step.type === 'question' ? TRAINING_RENDERERS[step.questionType](step) : step.type === 'complete' ? completeStep(step) : standardStep(step);
  content.focus({ preventScroll: true });
}

function openLesson() {
  activeStep = 0; selectedOptionId = null; answerChecked = false;
  document.querySelector('[data-lesson-view]').hidden = false;
  document.body.classList.add('lesson-open');
  renderLessonStep(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function closeLesson() { document.querySelector('[data-lesson-view]').hidden = true; document.body.classList.remove('lesson-open'); document.querySelector('#path').scrollIntoView(); }
function finishLesson() {
  const progress = loadProgress();
  if (!progress.completedLevels.includes(FIRST_LESSON.id)) progress.completedLevels.push(FIRST_LESSON.id);
  progress.answers['stock-ownership-01'] = { correct: true, completedAt: new Date().toISOString() };
  saveProgress(progress); renderLevels(); closeLesson();
}

function setupInteractions() {
  document.addEventListener('click', event => {
    if (event.target.closest('[data-start-level="stock"]')) openLesson();
    if (event.target.closest('[data-close-lesson]')) closeLesson();
    if (event.target.closest('[data-next-step]')) { activeStep += 1; selectedOptionId = null; answerChecked = false; renderLessonStep(); }
    if (event.target.closest('[data-check-answer]') && selectedOptionId) { answerChecked = true; renderLessonStep(); }
    if (event.target.closest('[data-retry-answer]')) { selectedOptionId = null; answerChecked = false; renderLessonStep(); }
    if (event.target.closest('[data-complete-level]')) finishLesson();
    if (event.target.closest('[data-reset-progress]')) document.querySelector('[data-reset-dialog]').hidden = false;
    if (event.target.closest('[data-cancel-reset]')) document.querySelector('[data-reset-dialog]').hidden = true;
    if (event.target.closest('[data-confirm-reset]')) { localStorage.removeItem(STORAGE_KEY); document.querySelector('[data-reset-dialog]').hidden = true; renderLevels(); closeLesson(); }
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

renderLevels(); setupNavigation(); setupInteractions();

