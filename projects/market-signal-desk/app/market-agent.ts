import type { Quote, Signal } from "./market-config";

export type AgentIntent = "brief" | "explain" | "risk";

export type AgentSource = {
  label: string;
  title: string;
  url: string;
};

export type AgentContext = {
  quotes: Quote[];
  signals: Pick<Signal, "id" | "title" | "url" | "source" | "publishedAt" | "priority" | "reason" | "actor" | "official" | "targets" | "score">[];
  activeSymbol?: string;
  watchlistSymbols?: string[];
};

export type AgentResult = {
  intent: AgentIntent;
  answer: string;
  sources: AgentSource[];
};

const benchmarkByMarket: Record<string, string> = {
  "美股": "nasdaq",
  "A股": "sse",
};

function signed(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "暂无";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function detectIntent(message: string): AgentIntent {
  if (/(能买|能买吗|买入|卖出|风险|亏|跌.*%|回撤|投入|仓位)/i.test(message)) return "risk";
  if (/(为什么|原因|怎么了|涨跌|这只|个股|公司)/i.test(message)) return "explain";
  return "brief";
}

function sourceList(signals: AgentContext["signals"]): AgentSource[] {
  return signals
    .filter(({ url }) => {
      try {
        return new URL(url).protocol === "https:";
      } catch {
        return false;
      }
    })
    .slice(0, 3)
    .map(({ source, title, url }) => ({ label: source, title, url }));
}

function sortedSignals(context: AgentContext) {
  return [...context.signals].sort((a, b) => a.priority - b.priority || b.score - a.score);
}

function findSelectedQuote(message: string, context: AgentContext) {
  const stocks = context.quotes.filter(({ type }) => type === "stock");
  return stocks.find(({ symbol }) => symbol === context.activeSymbol)
    ?? stocks.find(({ symbol, name }) => message.toUpperCase().includes(symbol.toUpperCase()) || message.includes(name))
    ?? stocks[0];
}

function marketBrief(context: AgentContext): AgentResult {
  const indices = context.quotes.filter(({ type, changePct }) => type === "index" && changePct !== null);
  const stocks = context.quotes.filter(({ type, changePct }) => type === "stock" && changePct !== null);
  const average = indices.length
    ? indices.reduce((sum, quote) => sum + (quote.changePct ?? 0), 0) / indices.length
    : null;
  const strongest = [...stocks].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))[0];
  const weakest = [...stocks].sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))[0];
  const important = sortedSignals(context).slice(0, 3);
  const mood = average === null ? "数据仍在连接" : average > .3 ? "整体偏强" : average < -.3 ? "整体偏弱" : "走势分化";
  const signalLines = important.length
    ? important.map((signal, index) => `${index + 1}. P${signal.priority} ${signal.actor}：${signal.title}`).join("\n")
    : "暂时没有新的高优先级消息。";

  return {
    intent: "brief",
    answer: `一分钟结论：当前市场${mood}。

大盘：${indices.length ? indices.map((quote) => `${quote.name} ${signed(quote.changePct)}`).join("；") : "主要指数暂未返回有效数据"}。
关注：${strongest ? `相对最强是${strongest.name} ${signed(strongest.changePct)}` : "暂无有效个股涨跌"}${weakest && weakest.id !== strongest?.id ? `，相对最弱是${weakest.name} ${signed(weakest.changePct)}` : ""}。

今天优先看：
${signalLines}

这是当前行情状态的整理，不代表下一交易日方向。重要消息请打开原文核对。`,
    sources: sourceList(important),
  };
}

function explainMove(message: string, context: AgentContext): AgentResult {
  const quote = findSelectedQuote(message, context);
  if (!quote) {
    return {
      intent: "explain",
      answer: "我还没有取得可分析的股票行情。请先在“行情入门”里选择或搜索一只股票，再问我为什么涨跌。",
      sources: [],
    };
  }

  const benchmark = context.quotes.find(({ id }) => id === benchmarkByMarket[quote.market]);
  const relativeGap = quote.changePct !== null && benchmark?.changePct !== null && benchmark
    ? quote.changePct - benchmark.changePct
    : null;
  const related = sortedSignals(context).filter((signal) =>
    signal.targets.includes(quote.id)
    || signal.actor.includes(quote.name)
    || signal.title.toUpperCase().includes(quote.symbol.toUpperCase())
    || signal.title.includes(quote.name),
  ).slice(0, 3);
  const dayPosition = quote.low !== null && quote.high !== null && quote.high > quote.low
    ? ((quote.value - quote.low) / (quote.high - quote.low)) * 100
    : null;

  const relativeText = benchmark && relativeGap !== null
    ? `${quote.name}相对${benchmark.name}${relativeGap >= 0 ? "强" : "弱"} ${Math.abs(relativeGap).toFixed(2)} 个百分点`
    : quote.market === "港股"
      ? "当前页面没有恒生指数，因此不拿其他市场指数硬作比较"
      : "对应市场基准数据不足，暂不做强弱比较";
  const evidence = related.length
    ? related.map((signal, index) => `${index + 1}. ${signal.official ? "官方" : signal.source}：${signal.title}`).join("\n")
    : "目前没有抓到与这只股票直接相关的高优先级消息，不能把涨跌强行归因给某一条新闻。";

  return {
    intent: "explain",
    answer: `${quote.name}今天 ${signed(quote.changePct)}，现价 ${quote.value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}。

我能确认：
• ${relativeText}。
• ${dayPosition === null ? "今日高低区间数据不足" : `现价位于今日高低区间约 ${dayPosition.toFixed(0)}% 的位置`}。

可能相关的公开信息：
${evidence}

需要留意：同时发生不等于因果。若没有公司公告或明确事件，涨跌也可能来自板块资金、市场情绪或交易结构。`,
    sources: sourceList(related),
  };
}

function riskCheck(message: string, context: AgentContext): AgentResult {
  const quote = findSelectedQuote(message, context);
  const amountMatch = message.replaceAll(",", "").match(/(?:投入|本金|资金|拿出)\s*(\d+(?:\.\d+)?)\s*(万|元)?/);
  const drawdownMatch = message.match(/(?:跌|下跌|回撤)\s*(\d+(?:\.\d+)?)\s*%/);
  const amount = amountMatch ? Number(amountMatch[1]) * (amountMatch[2] === "万" ? 10_000 : 1) : 10_000;
  const drawdown = drawdownMatch ? Math.min(100, Number(drawdownMatch[1])) : 20;
  const loss = amount * drawdown / 100;
  const watched = new Set(context.watchlistSymbols ?? context.quotes.filter(({ type }) => type === "stock").map(({ symbol }) => symbol));

  return {
    intent: "risk",
    answer: `先把风险换成人话：
如果投入 ${amount.toLocaleString("zh-CN")} 元，价格下跌 ${drawdown.toFixed(0)}%，账面大约减少 ${loss.toLocaleString("zh-CN")} 元。

买之前请回答五个问题：
1. 这笔钱多久以后会用？五年内要用的钱更怕短期大跌。
2. 如果真的亏 ${loss.toLocaleString("zh-CN")} 元，会不会影响家庭备用金、房贷或孩子教育？
3. 你能否用一句话说明${quote ? `为什么长期看好${quote.name}` : "买入理由"}，而不是“最近涨得好”？
4. 你的其他股票和基金是否也集中在同一个行业？
5. 如果明天下跌 ${drawdown.toFixed(0)}%，原来的买入理由是否仍然成立？

当前关注列表有 ${watched.size} 只股票。关注列表不等于真实持仓，因此我不会假装知道你的仓位。你可以继续告诉我“投入金额、最多能亏多少、多久后要用钱”，我再帮你把风险算清楚。`,
    sources: [],
  };
}

export function buildFallbackAgentAnswer(message: string, context: AgentContext): AgentResult {
  const intent = detectIntent(message);
  if (intent === "risk") return riskCheck(message, context);
  if (intent === "explain") return explainMove(message, context);
  return marketBrief(context);
}
