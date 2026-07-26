import type { Quote } from "./market-config";

export type MarketInsight = {
  title: string;
  detail: string;
  evidence: string;
  tone: "positive" | "negative" | "neutral";
};

export type MarketAnalysis = {
  headline: string;
  summary: string;
  snapshotTime: string;
  insights: MarketInsight[];
};

const benchmarkByMarket: Record<string, { id: string; shortName: string }> = {
  "美股": { id: "nasdaq", shortName: "纳指" },
  "A股": { id: "sse", shortName: "上证指数" },
};

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function tone(value: number): MarketInsight["tone"] {
  return value > 0.15 ? "positive" : value < -0.15 ? "negative" : "neutral";
}

export function buildMarketAnalysis(selected: Quote | undefined, indices: Quote[]): MarketAnalysis {
  const available = indices.filter((quote) => quote.changePct !== null);
  const average = available.length
    ? available.reduce((sum, quote) => sum + (quote.changePct ?? 0), 0) / available.length
    : 0;
  const rising = available.filter((quote) => (quote.changePct ?? 0) > 0).length;
  const falling = available.filter((quote) => (quote.changePct ?? 0) < 0).length;
  const majority = Math.ceil(available.length / 2);
  const mood = available.length === 0
    ? "数据不足"
    : rising >= majority && average >= 0.3
      ? "整体偏强"
      : falling >= majority && average <= -0.3
        ? "整体偏弱"
        : "走势分化";
  const sorted = [...available].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
  const breadthEvidence = available.length
    ? `${rising} 个上涨、${falling} 个下跌，平均 ${signed(average)}；最强 ${sorted[0].name} ${signed(sorted[0].changePct ?? 0)}，最弱 ${sorted.at(-1)?.name} ${signed(sorted.at(-1)?.changePct ?? 0)}`
    : "主要指数暂未返回有效涨跌数据";

  const benchmarkConfig = selected ? benchmarkByMarket[selected.market] : undefined;
  const benchmark = benchmarkConfig ? available.find(({ id }) => id === benchmarkConfig.id) : undefined;
  const relativeGap = selected?.changePct !== null && selected && benchmark?.changePct !== null && benchmark
    ? selected.changePct - benchmark.changePct
    : null;
  const relativeLabel = relativeGap === null
    ? "暂不比较"
    : relativeGap >= 0.5
      ? `明显强于${benchmarkConfig?.shortName}`
      : relativeGap >= 0.15
        ? `略强于${benchmarkConfig?.shortName}`
        : relativeGap <= -0.5
          ? `明显弱于${benchmarkConfig?.shortName}`
          : relativeGap <= -0.15
            ? `略弱于${benchmarkConfig?.shortName}`
            : `基本同步${benchmarkConfig?.shortName}`;
  const relativeEvidence = relativeGap === null
    ? selected?.market === "港股"
      ? "当前页面尚无恒生指数数据，因此不使用其他市场指数代替港股基准"
      : "个股或对应市场基准暂未返回有效涨跌数据"
    : `${selected?.name} ${signed(selected?.changePct ?? 0)}，${benchmarkConfig?.shortName} ${signed(benchmark?.changePct ?? 0)}，相差 ${signed(relativeGap)}`;

  const hasRange = selected?.low !== null && selected?.high !== null && selected && selected.high > selected.low;
  const rangePosition = hasRange
    ? Math.min(100, Math.max(0, ((selected.value - selected.low!) / (selected.high! - selected.low!)) * 100))
    : null;
  const rangeLabel = rangePosition === null
    ? "区间数据不足"
    : rangePosition >= 65
      ? "处于日内上部"
      : rangePosition <= 35
        ? "处于日内下部"
        : "处于日内中部";
  const rangeEvidence = rangePosition === null
    ? "今日最高价或最低价暂不可用"
    : `现价位于今日最低至最高区间的 ${rangePosition.toFixed(0)}% 位置`;

  const snapshot = Math.max(0, selected?.updatedAt ?? 0, ...available.map(({ updatedAt }) => updatedAt));
  const snapshotTime = snapshot
    ? new Date(snapshot).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : "--:--";
  const selectedMove = selected?.changePct ?? 0;
  const summary = selected
    ? `当前主要指数${mood.replace("整体", "")}，${selected.name}${relativeGap === null ? "暂不进行基准比较" : relativeLabel}，并${rangeLabel.replace("处于", "位于")}。这是行情状态描述，不代表后续方向。`
    : "行情仍在连接，数据到齐后将自动生成解读。";

  return {
    headline: mood,
    summary,
    snapshotTime,
    insights: [
      { title: `大盘：${mood}`, detail: "先看主要指数是否同向，再判断今天是普涨、普跌还是分化。", evidence: breadthEvidence, tone: tone(average) },
      { title: `相对强弱：${relativeLabel}`, detail: "把个股涨跌与同市场基准相比，避免只看一个孤立数字。", evidence: relativeEvidence, tone: relativeGap === null ? "neutral" : tone(relativeGap) },
      { title: `日内位置：${rangeLabel}`, detail: "高低区间反映今天价格所在位置，但不能单独预测下一步走势。", evidence: rangeEvidence, tone: tone(selectedMove) },
    ],
  };
}
