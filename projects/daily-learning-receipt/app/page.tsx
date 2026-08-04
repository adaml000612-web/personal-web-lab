"use client";

import { FormEvent, useMemo, useState } from "react";

function clip(text: string, fallback: string) {
  const tidy = text.trim().replace(/\s+/g, " ");
  if (!tidy) return fallback;
  return tidy.length > 72 ? `${tidy.slice(0, 72)}…` : tidy;
}

function diagnose(goal: string, action: string, blocker: string, evidence: string) {
  const combined = `${goal} ${action} ${blocker} ${evidence}`.trim();

  const vagueScope = /资料.*多|内容.*多|不知道.*第.*版|百科|重点|放哪些/.test(blocker);
  const visualUncertainty = /审美|不好看|美感|设计/.test(blocker);

  if (vagueScope && visualUncertainty) {
    return {
      issue: "你有两个不同的问题：第一版没有明确主题；页面也没有可执行的视觉参照。",
      blindSpot: "“介绍保时捷”太大，会让资料永远收不完；“想做得好看”也太抽象，无法告诉你下一笔该怎么改。",
      solution: [
        "先写一句首页主题：这不是保时捷百科，而是让第一次认识它的人明白“911 为什么成为经典”。",
        "第一版只保留四块：主题句、1 张主视觉、911 的 120 字介绍、3 个车型入口；其他资料一律先不放。",
        "找 1 个你觉得好看的汽车网站，只模仿它的版式节奏：大图位置、标题大小、文字留白；不要同时参考很多网站。",
      ],
      check: "明天结束前，首页只出现这四块内容。把页面截图给一个朋友看，对方 5 秒内能说出“这是在讲 911 为什么特别”，就算第一版完成。",
    };
  }

  if (combined.length < 48) {
    return {
      issue: "信息还不够，暂时不能对你的问题下判断。",
      blindSpot: "你写的是感受或方向，但少了可核对的事实：动作、卡点和结果。",
      solution: ["补写一个实际动作。", "补写一次卡住的具体瞬间。", "补写一个明天看得见的完成证据。"],
      check: "四格都能用一句完整的事实回答，而不是只写“学习”“迷茫”或“继续努力”。",
    };
  }

  if (action.trim().length < 16) {
    return {
      issue: "你的目标已经有了，但行动没有落到一个真实步骤上。",
      blindSpot: "你可能把“想清楚怎么做”当成了开始；可没有动作，就不会有能纠正方向的反馈。",
      solution: ["删掉“研究、看看、想想”这类动词。", "把任务缩到 20 分钟。", "写成一个动词开头的动作。"],
      check: "明天的任务能以“我已经完成了___”来回答，例如“我已写出四个输入问题”。",
    };
  }

  if (blocker.trim().length < 18) {
    return {
      issue: "你知道自己不顺，但还没定位到具体卡点。",
      blindSpot: "“有点难”不能指导下一步；要分清是不会、没时间、怕做错，还是不知道如何判断好坏。",
      solution: ["补全句子：“当我尝试___时，因为___，所以停在___。”", "只选其中一个原因处理。", "为这个原因找一次小测试，而不是继续泛泛学习。"],
      check: "卡点中必须出现一个具体动作和一个具体障碍，例如“写按钮时，不知道怎样让输入内容显示出来”。",
    };
  }

  if (evidence.trim().length < 14) {
    return {
      issue: "你做了事，但没有设完成标准，所以很难感到自己真的前进。",
      blindSpot: "没有证据时，大脑会默认“还不够好”，然后把下一步又扩大成一个模糊目标。",
      solution: ["选一种可保存的结果：文字、截图、页面或链接。", "给它规定数量或范围。", "完成后停止加新任务。"],
      check: "明天结束时能拿出一项东西，并用“有／没有”判断是否完成。",
    };
  }

  if (/别人|焦虑|跟不上|落后/.test(combined)) {
    return {
      issue: "你现在被比较感牵着走，它遮住了你已经拥有的具体进展。",
      blindSpot: "别人的成品不能用来衡量你今天是否完成了自己的小实验。",
      solution: ["先完成自己的验收项。", "把浏览案例限定为 15 分钟。", "只记录一条可以借用的做法。"],
      check: "今天留下的不是“别人做得好”，而是“我借用了哪一项做法，并用在了哪里”。",
    };
  }

  return {
      issue: "你已经把问题说具体了：现在真正需要的不是更多建议，而是完成一次小验证。",
      blindSpot: "不要急着把今天的卡点变成长期能力焦虑；它首先只是一个可以被下一次尝试回答的问题。",
      solution: ["只做你写下的验收项。", "卡住时先记录一次尝试，不立刻换方向。", "完成后再决定是否要加功能或继续学习。"],
      check: `明天优先完成：${clip(evidence, "你写下的验收证据")}。完成后才决定下一步。`,
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
    solution: string[];
    check: string;
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
            <article className="solution-card">
              <h2>怎么解决：按这三步做</h2>
              <ol>
                {reflection.solution.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </article>
            <article className="tomorrow-card">
              <h2>完成标准</h2>
              <p>{reflection.check}</p>
            </article>
          </div>
        </section>
      ) : (
        <p className="quiet-note">写完四格后，这里会告诉你：问题到底出在哪，以及明天先做什么。</p>
      )}
    </main>
  );
}
