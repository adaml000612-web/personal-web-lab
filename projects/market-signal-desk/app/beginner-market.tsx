"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { Quote } from "./market-config";

const currencySymbol: Record<string, string> = { USD: "$", HKD: "HK$", CNY: "¥" };

function number(value: number | null, prefix = "") {
  return value === null ? "—" : `${prefix}${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BeginnerMarket({ quotes, loading }: { quotes: Quote[]; loading: boolean }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState<Quote[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const stocks = useMemo(() => {
    const merged = [...searched, ...quotes.filter(({ type }) => type === "stock")];
    return [...new Map(merged.map((quote) => [quote.symbol, quote])).values()];
  }, [quotes, searched]);
  const selected = stocks.find(({ id }) => id === selectedId) ?? stocks[0];
  const indices = quotes.filter(({ type }) => type === "index");

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const response = await fetch(`/api/market?symbols=${encodeURIComponent(query)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.items?.length) throw new Error(data.error || "没有找到这只股票");
      setSearched((current) => [...data.items, ...current]);
      setSelectedId(data.items[0].id);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "查询失败，请检查代码");
    } finally {
      setSearching(false);
    }
  }

  const positive = (selected?.changePct ?? 0) >= 0;
  const prefix = selected ? currencySymbol[selected.currency] ?? "" : "";

  return (
    <section className="beginner-market" id="top">
      <header className="price-intro">
        <div>
          <p className="eyebrow">BEGINNER QUOTE BOARD</p>
          <h1>先看懂价格，<br /><em>再考虑交易</em></h1>
        </div>
        <div>
          <p>输入股票代码即可查询。支持 NVDA 这类美股代码、00700 或 0700.HK 港股代码，以及 300308 或 600519 这类 A 股代码。</p>
          <form className="stock-search" onSubmit={search}>
            <label className="sr-only" htmlFor="stock-symbol">股票代码</label>
            <input id="stock-symbol" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如 NVDA、0700.HK、300308" />
            <button disabled={searching}>{searching ? "查询中" : "查价格"}</button>
          </form>
          {searchError && <small className="search-error">{searchError}</small>}
        </div>
      </header>

      <div className="quote-layout">
        <aside className="quote-picker">
          <div className="section-heading"><span>01</span><div><h2>选择股票</h2><p>关注列表与查询结果</p></div></div>
          {loading && stocks.length === 0 ? <div className="quote-skeleton" /> : stocks.map((quote) => (
            <button className={`quote-option ${selected?.id === quote.id ? "is-active" : ""}`} onClick={() => setSelectedId(quote.id)} key={quote.id}>
              <span><strong>{quote.name}</strong><small>{quote.symbol} · {quote.market}</small></span>
              <b className={(quote.changePct ?? 0) >= 0 ? "positive" : "negative"}>
                {(quote.changePct ?? 0) >= 0 ? "+" : ""}{quote.changePct?.toFixed(2)}%
              </b>
            </button>
          ))}
        </aside>

        <div className="quote-focus">
          <div className="section-heading"><span>02</span><div><h2>价格卡片</h2><p>只保留最常用的信息</p></div></div>
          {selected ? (
            <>
              <article className="hero-quote">
                <div><span>{selected.market}</span><small>{selected.symbol}</small></div>
                <h2>{selected.name}</h2>
                <strong>{number(selected.value, prefix)}</strong>
                <p className={positive ? "positive" : "negative"}>
                  {positive ? "▲" : "▼"} {Math.abs(selected.changePct ?? 0).toFixed(2)}%
                  <small> 相比上一个交易日收盘价</small>
                </p>
              </article>
              <div className="quote-metrics">
                {[
                  ["昨收", selected.previous, "上一个交易日最后的价格"],
                  ["今开", selected.open, "今天开盘时的第一笔参考价"],
                  ["最高", selected.high, "今天到目前为止的最高价"],
                  ["最低", selected.low, "今天到目前为止的最低价"],
                ].map(([label, value, help]) => (
                  <div key={label as string}><span>{label}</span><strong>{number(value as number | null, prefix)}</strong><small>{help}</small></div>
                ))}
              </div>
            </>
          ) : <div className="empty-state"><strong>行情正在连接</strong><p>如果暂时没有数据，请稍后刷新。</p></div>}
        </div>

        <aside className="beginner-guide">
          <div className="section-heading"><span>03</span><div><h2>新手先看这三点</h2><p>价格不是买入理由</p></div></div>
          <ol>
            <li><strong>先看涨跌幅</strong><p>它表示相对昨收的变化，不代表明天还会按同一方向走。</p></li>
            <li><strong>再看高低区间</strong><p>当前价靠近今日最高，说明当日相对强；靠近最低则相对弱。</p></li>
            <li><strong>最后核对消息</strong><p>价格异动可能来自公告、财报或行业消息，可切回情报雷达查看。</p></li>
          </ol>
          <div className="delay-note"><strong>关于“实时”</strong><p>页面每 60 秒自动刷新，但第三方行情可能延迟，不应用作下单报价。</p></div>
        </aside>
      </div>

      <div className="index-ticker" aria-label="主要指数">
        {indices.map((quote) => <span key={quote.id}><b>{quote.name}</b>{number(quote.value)} <i className={(quote.changePct ?? 0) >= 0 ? "positive" : "negative"}>{(quote.changePct ?? 0) >= 0 ? "+" : ""}{quote.changePct?.toFixed(2)}%</i></span>)}
      </div>
    </section>
  );
}
