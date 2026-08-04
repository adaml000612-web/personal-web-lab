"use client";

import { FormEvent, useMemo, useState } from "react";

function clip(text: string, fallback: string) {
  const tidy = text.trim().replace(/\s+/g, " ");
  if (!tidy) return fallback;
  return tidy.length > 72 ? `${tidy.slice(0, 72)}…` : tidy;
}

function diagnose(learning: string, thought: string) {
  const combined = `${learning} ${thought}`.trim();

  if (combined.length < 24) {
    return {
      issue: "你写下的是一个方向，但还不是可分析的问题。",
      blindSpot: "现在缺少具体情境：你做了什么、哪里没达到预期、你原本以为会怎样。没有这些，任何建议都只能停在鼓励层面。",
      next: "补一件真实小事：今天你想做什么、实际做到了哪一步、卡住时脑子里在想什么。",
    };
  }

  if (/不知道|迷茫|方向|怎么开始|从哪/.test(combined)) {
    return {
      issue: "你当前的问题不是“没有方向”，而是目标太大，第一步没有被缩小。",
      blindSpot: "当“学会做工具”这种目标没有边界时，你会不断寻找更好的方向，却没有得到能让自己安心的实际反馈。",
      next: "只选一个 20 分钟能完成的动作：写一个页面标题、列出三个输入项，或让 Codex 做出一个按钮。",
    };
  }

  if (/看了|学了|了解|学习/.test(learning) && !/做了|写了|试了|完成|练习/.test(learning)) {
    return {
      issue: "你今天主要在接收信息，还没有把它变成自己的能力。",
      blindSpot: "“我理解了”很容易让人感觉在进步，但没有亲手尝试时，明天往往又要从头想起。",
      next: "把今天的一点内容转成一个产出：一条自己的解释、一个小页面，或一次真实操作。",
    };
  }

  if (/别人|焦虑|跟不上|落后/.test(combined)) {
    return {
      issue: "比较正在替代行动，消耗了你本来可以用于试一次的注意力。",
      blindSpot: "你看到的是别人的成品，却拿它和自己正在学习的过程相比；这会让每一步都显得不够。",
      next: "今天只记录一个可见证据：你亲手做了什么、学会了什么、下一次能比昨天少问什么。",
    };
  }

  return {
    issue: "你已经发现了一个真实问题，但还没有把“解决了”定义清楚。",
    blindSpot: "如果没有完成标准，之后每一次修改都会像在原地打转，因为你无法判断这次是不是已经足够。",
    next: "用一句话定义完成：明天我能做出／验证什么，才算这件事向前推进了？",
  };
}

export default function Home() {
  const [learning, setLearning] = useState("");
  const [thought, setThought] = useState("");
  const [reflection, setReflection] = useState<null | {
    learning: string;
    thought: string;
    issue: string;
    blindSpot: string;
    next: string;
  }>(null);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "long",
      }).format(new Date()),
    [],
  );

  function createReflection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const diagnosis = diagnose(learning, thought);
    setReflection({
      learning: clip(learning, "今天还没有记录学习内容。"),
      thought: clip(thought, "今天还没有写下困惑或想法。"),
      ...diagnosis,
    });
  }

  return (
    <main className="page-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">今天的学习收据</p>
          <h1>把零散的念头，<br />变成明天的方向。</h1>
        </div>
        <p className="date-stamp">{today}</p>
      </header>

      <section className="intro" aria-label="使用说明">
        <span className="step">01</span>
        <p>不需要写得完整。留下今天真正学到的事，和一个还没想明白的念头。</p>
      </section>

      <form className="reflection-form" onSubmit={createReflection}>
        <label className="entry-card entry-learning">
          <span className="entry-number">A</span>
          <span className="label-text">我今天学到／解决了什么？</span>
          <textarea
            value={learning}
            onChange={(event) => setLearning(event.target.value)}
            placeholder="例如：我明白了网页项目要先写清第一版只做什么。"
            rows={5}
          />
        </label>

        <label className="entry-card entry-thought">
          <span className="entry-number">B</span>
          <span className="label-text">我还在想什么，或卡在哪里？</span>
          <textarea
            value={thought}
            onChange={(event) => setThought(event.target.value)}
            placeholder="例如：我不知道第一个小工具该从哪里开始做。"
            rows={5}
          />
        </label>

        <button type="submit" className="generate-button">
          生成今日复盘 <span aria-hidden="true">→</span>
        </button>
      </form>

      {reflection ? (
        <section className="receipt" aria-live="polite">
          <div className="receipt-heading">
            <p className="eyebrow">02 · 今日复盘</p>
            <span>已生成</span>
          </div>
          <div className="receipt-grid">
            <article className="evidence-card">
              <h2>你写下的事实</h2>
              <p>{reflection.learning}</p>
              <p className="thought-line">{reflection.thought}</p>
            </article>
            <article className="issue-card">
              <h2>我看到的当前症结</h2>
              <p>{reflection.issue}</p>
              <h3>可能忽略的地方</h3>
              <p>{reflection.blindSpot}</p>
            </article>
            <article className="tomorrow-card">
              <h2>明天最重要的一步</h2>
              <p>{reflection.next}</p>
            </article>
          </div>
        </section>
      ) : (
        <p className="quiet-note">写完两块内容后，复盘会出现在这里。</p>
      )}
    </main>
  );
}
