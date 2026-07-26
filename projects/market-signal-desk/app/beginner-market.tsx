"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import type { KlinePeriod, KlinePoint } from "./kline";
import { KlineChart } from "./kline-chart";
import type { Quote } from "./market-config";

const currencySymbol: Record<string, string> = { USD: "$", HKD: "HK$", CNY: "¥" };

function number(value: number | null, prefix = "") {
  return value === null ? "—" : `${prefix}${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BeginnerMarket({ quotes, loading, initialSymbol = "" }: { quotes: Quote[]; loading: boolean; initialSymbol?: string }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState<Quote[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [period, setPeriod] = useState<KlinePeriod>("day");
  const [kline, setKline] = useState<KlinePoint[]>([]);
  const [klineLoading, setKlineLoading] = useState(false);
  const [klineError, setKlineError] = useState("");

  const stocks = useMemo(() => {
    const merged = [...searched, ...quotes.filter(({ type }) => type === "stock")];
    return [...new Map(merged.map((quote) => [quote.symbol, quote])).values()];
  }, [quotes, searched]);
  const selected = stocks.find(({ id }) => id === selectedId)
    ?? stocks.find(({ symbol }) => symbol === initialSymbol)
    ?? stocks[0];
  const indices = quotes.filter(({ type }) => type === "index");

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setKlineLoading(true);
      setKlineError("");
      try {
        const response = await fetch(`/api/kline?symbol=${encodeURIComponent(selected.symbol)}&period=${period}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "K 线加载失败");
        setKline(data.points ?? []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setKline([]);
          setKlineError(error instanceof Error ? error.message : "K 线加载失败");
        }
      } finally {
        if (!controller.signal.aborted) setKlineLoading(false);
      }
    }, 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [period, selected]);

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
  const changeAmount = selected?.previous === null || !selected ? null : selected.value - selected.previous;
  const dayRange = selected?.low !== null && selected?.high !== null && selected && selected.high > selected.low
    ? Math.min(100, Math.max(0, ((selected.value - selected.low) / (selected.high - selected.low)) * 100))
    : 50;
  const quoteTime = selected
    ? new Date(selected.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  return (
    <section className="beginner-market" id="top">
      <header className="price-intro price-intro--compact">
        <div>
          <p className="eyebrow">BEGINNER QUOTE BOARD</p>
          <h1>股票行情</h1>
          <p>涨跌优先，现价与 K 线作为辅助。选择左侧股票，或输入代码查询。</p>
        </div>
        <div>
          <form className="stock-search" onSubmit={search}>
            <label className="sr-only" htmlFor="stock-symbol">股票代码</label>
            <input id="stock-symbol" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如 NVDA、0700.HK、300308" />
            <button disabled={searching}>{searching ? "查询中" : "查价格"}</button>
          </form>
          {searchError && <small className="search-error">{searchError}</small>}
        </div>
      </header>

      <aside className="beginner-guide beginner-guide--primary">
        <div className="section-heading">
          <span>GUIDE</span>
          <div><h2>新手先按这三步判断</h2><p>先理解今天发生了什么，再考虑是否交易</p></div>
        </div>
        <ol>
          <li><strong>先看涨跌幅</strong><p>确认今天相对昨收上涨还是下跌，以及变化幅度是否异常。</p></li>
          <li><strong>再看高低区间</strong><p>现价靠近今日最高说明当日偏强；靠近最低则说明当日偏弱。</p></li>
          <li><strong>最后核对消息</strong><p>价格异动可能来自公告、财报或行业消息，切回情报雷达查原因。</p></li>
        </ol>
        <div className="delay-note"><strong>数据说明</strong><p>页面每 60 秒刷新，但第三方行情可能延迟，不应用作下单报价。</p></div>
      </aside>

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
                <header className="quote-card-head">
                  <div>
                    <span>{selected.market} · {selected.symbol}</span>
                    <h2>{selected.name}</h2>
                  </div>
                  <small><i /> 行情快照 · {quoteTime}</small>
                </header>

                <div className="quote-card-primary">
                  <div className="hero-change">
                    <span>今日涨跌</span>
                    <p className={positive ? "positive" : "negative"}>
                      {positive ? "▲" : "▼"} {Math.abs(selected.changePct ?? 0).toFixed(2)}%
                    </p>
                    <small>
                      较昨收 {changeAmount === null ? "—" : `${changeAmount >= 0 ? "+" : "−"}${number(Math.abs(changeAmount), prefix)}`}
                    </small>
                  </div>
                  <div className="hero-price">
                    <span>现价</span>
                    <strong>{number(selected.value, prefix)}</strong>
                    <small>昨收 {number(selected.previous, prefix)}</small>
                  </div>
                </div>

                <div className="day-range" style={{ "--range-position": `${dayRange}%` } as CSSProperties}>
                  <div><span>当日位置</span><small>现价在今日高低区间的位置</small></div>
                  <div className="range-track"><i /></div>
                  <div className="range-values">
                    <span>最低 <strong>{number(selected.low, prefix)}</strong></span>
                    <span>最高 <strong>{number(selected.high, prefix)}</strong></span>
                  </div>
                </div>

                <div className="quote-metrics">
                  {[
                    ["昨收", selected.previous],
                    ["今开", selected.open],
                    ["最高", selected.high],
                    ["最低", selected.low],
                  ].map(([label, value]) => (
                    <div key={label as string}><span>{label}</span><strong>{number(value as number | null, prefix)}</strong></div>
                  ))}
                </div>
              </article>
              <section className="kline-section">
                <div className="kline-heading">
                  <div><strong>K 线与成交量</strong><small>红色收涨，绿色收跌；均线用于观察一段时间的平均价格。</small></div>
                  <div className="period-tabs" aria-label="K 线周期">
                    {([["day", "日 K"], ["week", "周 K"], ["month", "月 K"]] as const).map(([value, label]) => (
                      <button className={period === value ? "is-active" : ""} onClick={() => setPeriod(value)} key={value}>{label}</button>
                    ))}
                  </div>
                </div>
                {klineLoading ? <div className="kline-loading">正在读取历史行情…</div>
                  : klineError ? <div className="data-notice">{klineError}</div>
                    : <KlineChart points={kline} />}
              </section>
            </>
          ) : <div className="empty-state"><strong>行情正在连接</strong><p>如果暂时没有数据，请稍后刷新。</p></div>}
        </div>

      </div>

      <div className="index-ticker" aria-label="主要指数">
        {indices.map((quote) => <span key={quote.id}><b>{quote.name}</b>{number(quote.value)} <i className={(quote.changePct ?? 0) >= 0 ? "positive" : "negative"}>{(quote.changePct ?? 0) >= 0 ? "+" : ""}{quote.changePct?.toFixed(2)}%</i></span>)}
      </div>
    </section>
  );
}
