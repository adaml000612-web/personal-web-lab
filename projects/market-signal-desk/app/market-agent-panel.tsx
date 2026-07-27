"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AgentContext, AgentSource } from "./market-agent";
import type { Quote, Signal } from "./market-config";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: AgentSource[];
};

const welcome: ChatMessage = {
  role: "assistant",
  content: "我是问前哨。我会使用页面里的真实行情和新闻，帮你看懂市场、解释涨跌，并在买入前把风险换算成人话。",
};

const quickQuestions = [
  ["一分钟看懂今天", "用一分钟帮我看懂今天，先说最重要的。"],
  ["为什么涨跌？", "解释我现在查看的这只股票为什么涨跌。"],
  ["买前风险检查", "如果投入10000元后下跌20%，帮我做买入前风险检查。"],
] as const;

export function MarketAgentPanel({
  quotes,
  signals,
  activeSymbol,
}: {
  quotes: Quote[];
  signals: Signal[];
  activeSymbol?: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [customWatchlist, setCustomWatchlist] = useState<Quote[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function readWatchlist() {
      try {
        const stored = JSON.parse(localStorage.getItem("msd-custom-watchlist") ?? "[]");
        setCustomWatchlist(Array.isArray(stored) ? stored : []);
      } catch {
        setCustomWatchlist([]);
      }
    }
    readWatchlist();
    window.addEventListener("msd-watchlist-change", readWatchlist);
    return () => window.removeEventListener("msd-watchlist-change", readWatchlist);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [loading, messages]);

  async function ask(message: string) {
    const question = message.trim();
    if (!question || loading) return;
    const userMessage: ChatMessage = { role: "user", content: question };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    const context: AgentContext = {
      quotes: [...new Map([...quotes, ...customWatchlist].map((quote) => [quote.symbol, quote])).values()].slice(0, 20),
      signals: signals.slice(0, 20).map(({ id, title, url, source, publishedAt, priority, reason, actor, official, targets, score }) => ({
        id, title, url, source, publishedAt, priority, reason, actor, official, targets, score,
      })),
      activeSymbol,
      watchlistSymbols: [...new Set([...quotes.filter(({ type }) => type === "stock"), ...customWatchlist].map(({ symbol }) => symbol))],
    };

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          context,
          history: messages.slice(-6).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "智能体暂时没有回应");
      setMessages((current) => [...current, { role: "assistant", content: data.answer, sources: data.sources }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: "assistant",
        content: error instanceof Error ? error.message : "智能体暂时没有回应，请稍后再试。",
      }]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  return (
    <>
      <button className={`agent-launcher ${open ? "is-open" : ""}`} onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="market-agent-panel">
        <span className="agent-launcher-mark"><i /></span>
        <span><strong>问前哨</strong><small>投资新手陪练</small></span>
      </button>

      {open && (
        <aside className="agent-panel" id="market-agent-panel" role="dialog" aria-modal="false" aria-label="问前哨智能体">
          <header className="agent-header">
            <div className="agent-avatar"><i /><span>AI</span></div>
            <div><strong>问前哨</strong><small><i /> 正在读取当前行情</small></div>
            <button onClick={() => setOpen(false)} aria-label="关闭问前哨">×</button>
          </header>

          <div className="agent-context-strip">
            <span>已连接</span>
            <strong>{quotes.filter(({ type }) => type === "stock").length + customWatchlist.length} 只关注</strong>
            <strong>{signals.length} 条情报</strong>
            {activeSymbol && <strong>正在查看 {activeSymbol}</strong>}
          </div>

          <div className="agent-chat-log" ref={logRef} aria-live="polite">
            {messages.map((message, index) => (
              <div className={`agent-message agent-message--${message.role}`} key={`${message.role}-${index}`}>
                {message.role === "assistant" && <span>前哨</span>}
                <p>{message.content}</p>
                {message.sources?.length ? (
                  <div className="agent-sources">
                    <small>核对来源</small>
                    {message.sources.map((source) => (
                      <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.label}<span>↗</span></a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {loading && <div className="agent-thinking"><i /><i /><i /><span>正在整理真实数据</span></div>}
          </div>

          {messages.length < 3 && (
            <div className="agent-quick-actions" aria-label="快捷提问">
              {quickQuestions.map(([label, question]) => <button onClick={() => void ask(question)} key={label}>{label}<span>→</span></button>)}
            </div>
          )}

          <form className="agent-input" onSubmit={submit}>
            <label className="sr-only" htmlFor="agent-question">向问前哨提问</label>
            <input
              id="agent-question"
              ref={inputRef}
              value={input}
              maxLength={600}
              onChange={(event) => setInput(event.target.value)}
              placeholder="例如：英伟达今天为什么跌？"
              disabled={loading}
            />
            <button disabled={loading || !input.trim()} aria-label="发送问题">↑</button>
          </form>
          <p className="agent-disclaimer">只做信息解释和风险陪练，不提供买卖指令。</p>
        </aside>
      )}
    </>
  );
}
