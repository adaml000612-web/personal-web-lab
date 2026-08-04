"use client";

import { FormEvent, useMemo, useState } from "react";

function clip(text: string, fallback: string) {
  const tidy = text.trim().replace(/\s+/g, " ");
  if (!tidy) return fallback;
  return tidy.length > 72 ? `${tidy.slice(0, 72)}…` : tidy;
}

function diagnose(goal: string, action: string, blocker: string, evidence: string) {
  const combined = `${goal} ${action} ${blocker} ${evidence}`.trim();

  if (combined.length < 48) {
    return {
      issue: "信息还不够，暂时不能对你的问题下判断。",
      blindSpot: "你写的是感受或方向，但少了可核对的事实：动作、卡点和结果。",
      next: "先补全四格，尤其写清“我实际做了什么”和“做到什么算完成”。",
    };
  }

  if (action.trim().length < 16) {
    return {
      issue: "你的目标已经有了，但行动没有落到一个真实步骤上。",
      blindSpot: "你可能把“想清楚怎么做”当成了开始；可没有动作，就不会有能纠正方向的反馈。",
      next: "把明天的动作写成一个动词开头的句子：例如“写出四个输入问题，并用自己的一天填一遍”。",
    };
  }

  if (blocker.trim().length < 18) {
    return {
      issue: "你知道自己不顺，但还没定位到具体卡点。",
      blindSpot: "“有点难”不能指导下一步；要分清是不会、没时间、怕做错，还是不知道如何判断好坏。",
      next: "把卡点补成一句完整事实：“当我尝试___时，因为___，所以停在___。”",
    };
  }

  if (evidence.trim().length < 14) {
    return {
      issue: "你做了事，但没有设完成标准，所以很难感到自己真的前进。",
      blindSpot: "没有证据时，大脑会默认“还不够好”，然后把下一步又扩大成一个模糊目标。",
      next: "给明天留一个可检查的结果：一段文字、一个页面、一张截图，或一条能自己解释的结论。",
    };
  }

  if (/别人|焦虑|跟不上|落后/.test(combined)) {
    return {
      issue: "你现在被比较感牵着走，它遮住了你已经拥有的具体进展。",
      blindSpot: "别人的成品不能用来衡量你今天是否完成了自己的小实验。",
      next: "明天先完成你写下的验收证据，再决定是否要看别人的案例。",
    };
  }

  return {
    issue: "你已经把问题说具体了：现在真正需要的不是更多建议，而是完成一次小验证。",
    blindSpot: "不要急着把今天的卡点变成长期能力焦虑；它首先只是一个可以被下一次尝试回答的问题。",
    next: `明天优先完成：${clip(evidence, "你写下的验收证据")}。做完后再判断下一步，而不是提前扩大任务。`,
  };
}

export default function Home() {
  const [goal, setGoal] = useState("");
  const [action, setAction] = useState("");
  const [blocker, setBlocker] = useState("");
  const [evidence, setEvidence] = useState("");
  const [reflection, setReflection] = useState<null | {
    goal: string;
    action: string;
    blocker: string;
    evidence: string;
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
    const diagnosis = diagnose(goal, action, blocker, evidence);
    setReflection({
      goal: clip(goal, "还没有写下今天原本想推进的事。"),
      action: clip(action, "还没有记录实际做过的动作。"),
      blocker: clip(blocker, "还没有写下具体卡点。"),
      evidence: clip(evidence, "还没有写下明天的验收证据。"),
      ...diagnosis,
    });
  }

  return (
    <main className="page-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">今天的学习收据</p>
          <h1>别急着总结。<br />先把事实说清楚。</h1>
        </div>
        <p className="date-stamp">{today}</p>
      </header>

      <section className="intro" aria-label="使用说明">
        <span className="step">01</span>
        <p>这不是日记。按顺序回答四个问题，才有材料看清你真正卡在哪里。</p>
      </section>

      <form className="reflection-form" onSubmit={createReflection}>
        <label className="entry-card entry-goal">
          <span className="entry-number">1</span>
          <span className="label-text">我原本想推进什么？</span>
          <textarea
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="例如：做出能指出我问题的每日复盘网页。"
            rows={4}
          />
        </label>

        <label className="entry-card entry-action">
          <span className="entry-number">2</span>
          <span className="label-text">我实际做了什么？</span>
          <textarea
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="例如：我写了第一版页面，并试着让它分析两段输入。"
            rows={4}
          />
        </label>

        <label className="entry-card entry-blocker">
          <span className="entry-number">3</span>
          <span className="label-text">我卡在什么具体瞬间？试过什么？</span>
          <textarea
            value={blocker}
            onChange={(event) => setBlocker(event.target.value)}
            placeholder="例如：分析结果很泛；我试过多写一点，但问题仍然不够具体。"
            rows={4}
          />
        </label>

        <label className="entry-card entry-evidence">
          <span className="entry-number">4</span>
          <span className="label-text">明天留下什么，才算真的推进？</span>
          <textarea
            value={evidence}
            onChange={(event) => setEvidence(event.target.value)}
            placeholder="例如：用自己的真实记录填完四格，并得到一条可执行的明日动作。"
            rows={4}
          />
        </label>

        <button type="submit" className="generate-button">
          看清我的问题 <span aria-hidden="true">→</span>
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
              <p><strong>目标：</strong>{reflection.goal}</p>
              <p className="thought-line"><strong>行动：</strong>{reflection.action}</p>
              <p className="thought-line"><strong>卡点：</strong>{reflection.blocker}</p>
              <p className="thought-line"><strong>证据：</strong>{reflection.evidence}</p>
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
        <p className="quiet-note">写完四格后，这里会告诉你：问题到底出在哪，以及明天先做什么。</p>
      )}
    </main>
  );
}
