"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Quote = {
  id: string;
  symbol: string;
  name: string;
  market: string;
  type: "stock" | "index";
  value: number;
  changePct: number | null;
  currency: string;
  updatedAt: number;
};

type Signal = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  priority: 1 | 2 | 3 | 4;
  reason: string;
  actor: string;
  official: boolean;
  image?: string;
};

const watchlist = [
  { id: "nvda", symbol: "NVDA", name: "英伟达", market: "美股", tone: "blue" },
  { id: "spacex", symbol: "PRIVATE", name: "SpaceX", market: "未上市", tone: "amber" },
  { id: "tsla", symbol: "TSLA", name: "特斯拉", market: "美股", tone: "coral" },
  { id: "googl", symbol: "GOOGL", name: "谷歌", market: "美股", tone: "blue" },
  { id: "tencent", symbol: "0700.HK", name: "腾讯", market: "港股", tone: "mint" },
  { id: "innolight", symbol: "300308.SZ", name: "中际旭创", market: "A股", tone: "amber" },
] as const;

const indexOrder = ["nasdaq", "sp500", "sse"];

const sourceLinks = [
  { label: "SEC 披露", href: "https://www.sec.gov/edgar/search/" },
  { label: "巨潮资讯", href: "https://www.cninfo.com.cn/" },
  { label: "港交所披露易", href: "https://www1.hkexnews.hk/index_c.htm" },
  { label: "上交所公告", href: "https://www.sse.com.cn/disclosure/listedinfo/announcement/" },
];

function displayNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  const minutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export function MarketDashboard() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState("all");
  const [priority, setPriority] = useState<number | "all">("all");
  const [saved, setSaved] = useState<string[]>([]);
  const [read, setRead] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSaved(JSON.parse(localStorage.getItem("msd-saved") ?? "[]"));
        setRead(JSON.parse(localStorage.getItem("msd-read") ?? "[]"));
      } catch {
        localStorage.removeItem("msd-saved");
        localStorage.removeItem("msd-read");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError("");
    try {
      const [marketResponse, newsResponse] = await Promise.all([
        fetch("/api/market", { cache: "no-store" }),
        fetch("/api/news", { cache: "no-store" }),
      ]);
      if (!marketResponse.ok || !newsResponse.ok) throw new Error("数据服务暂时不可用");
      const marketData = await marketResponse.json();
      const newsData = await newsResponse.json();
      setQuotes(marketData.items ?? []);
      setUnavailable(marketData.unavailable ?? []);
      setSignals(newsData.signals ?? []);
      setLastUpdated(new Date());
    } catch {
      setError("暂时没有拉到最新数据，请稍后再刷新。页面不会用虚构数据填充。");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const quoteMap = useMemo(() => new Map(quotes.map((quote) => [quote.id, quote])), [quotes]);

  const filteredSignals = useMemo(() => {
    return signals.filter((signal) => {
      const watch = watchlist.find((item) => item.id === selected);
      const matchesActor =
        selected === "all" ||
        (watch &&
          (signal.actor.includes(watch.name) ||
            signal.title.toLowerCase().includes(watch.name.toLowerCase()) ||
            signal.title.toLowerCase().includes(watch.symbol.toLowerCase())));
      return matchesActor && (priority === "all" || signal.priority === priority);
    });
  }, [priority, selected, signals]);

  function toggleSaved(id: string) {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem("msd-saved", JSON.stringify(next));
      return next;
    });
  }

  function openSignal(signal: Signal) {
    setRead((current) => {
      if (current.includes(signal.id)) return current;
      const next = [...current, signal.id];
      localStorage.setItem("msd-read", JSON.stringify(next));
      return next;
    });
  }

  const indices = indexOrder.map((id) => quoteMap.get(id)).filter((quote): quote is Quote => Boolean(quote));

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="前哨首页">
          <span className="brand-mark" aria-hidden="true">前</span>
          <span><strong>前哨</strong><small>MARKET SIGNAL DESK</small></span>
        </a>
        <div className="market-clock" aria-label="数据状态">
          <span className={error ? "status-dot status-dot--warn" : "status-dot"} />
          <span>{lastUpdated ? `更新于 ${lastUpdated.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` : "正在连接数据源"}</span>
        </div>
        <button className="refresh-button" onClick={() => void loadData(true)} disabled={refreshing}>
          <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"} aria-hidden="true">↻</span>
          {refreshing ? "扫描中" : "刷新情报"}
        </button>
      </header>

      <section className="command-strip" id="top">
        <div>
          <p className="eyebrow">PERSONAL MARKET INTELLIGENCE</p>
          <h1>只看与你有关的<br /><em>市场信号</em></h1>
        </div>
        <p className="intro">先关注公司本身，再看产业链、所属指数与海外映射。信息按关系远近排队，不让噪音抢走你的注意力。</p>
        <div className="scan-orbit" aria-hidden="true">
          <span className="orbit orbit-a" /><span className="orbit orbit-b" /><span className="orbit-core">LIVE</span>
        </div>
      </section>

      <div className="dashboard-grid">
        <aside className="watch-panel">
          <div className="section-heading">
            <span>01</span><div><h2>我的关注</h2><p>6 个标的 · 3 个市场</p></div>
          </div>
          <button data-watch-id="all" className={`watch-item watch-item--all ${selected === "all" ? "is-active" : ""}`} onClick={() => setSelected("all")}>
            <span className="watch-avatar">全</span><span><strong>全部情报</strong><small>按优先级汇总</small></span><b>{signals.length}</b>
          </button>
          <div className="watch-list">
            {watchlist.map((item) => {
              const quote = quoteMap.get(item.id);
              return (
                <button data-watch-id={item.id} className={`watch-item ${selected === item.id ? "is-active" : ""}`} key={item.id} onClick={() => setSelected(item.id)}>
                  <span className={`watch-avatar tone-${item.tone}`}>{item.name.slice(0, 1)}</span>
                  <span><strong>{item.name}</strong><small>{item.symbol} · {item.market}</small></span>
                  {quote ? (
                    <b className={(quote.changePct ?? 0) >= 0 ? "positive" : "negative"}>
                      {(quote.changePct ?? 0) >= 0 ? "+" : ""}{quote.changePct?.toFixed(2)}%
                    </b>
                  ) : item.id === "spacex" ? <b className="private-label">新闻</b> : <b className="muted">—</b>}
                </button>
              );
            })}
          </div>
          <div className="future-slot">
            <span>下一观察位</span><strong>长鑫存储</strong><p>正式上市并确认交易代码后接入，不提前填入猜测代码。</p>
          </div>
        </aside>

        <section className="signal-panel">
          <div className="section-heading signal-heading">
            <span>02</span>
            <div><h2>信号队列</h2><p>{selected === "all" ? "全部关注标的" : watchlist.find((item) => item.id === selected)?.name}</p></div>
            <div className="priority-tabs" aria-label="按优先级筛选">
              {(["all", 1, 2, 3, 4] as const).map((level) => (
                <button key={level} className={priority === level ? "is-active" : ""} onClick={() => setPriority(level)}>
                  {level === "all" ? "全部" : `P${level}`}
                </button>
              ))}
            </div>
          </div>
          <div className="priority-legend">
            <span><i className="p1" />P1 公司/官方</span><span><i className="p2" />P2 板块/产业链</span>
            <span><i className="p3" />P3 指数</span><span><i className="p4" />P4 海外映射</span>
          </div>

          {error && <div className="data-notice">{error}</div>}
          {loading ? (
            <div className="signal-loading">{[1, 2, 3, 4].map((item) => <span key={item} />)}</div>
          ) : filteredSignals.length ? (
            <div className="signal-list">
              {filteredSignals.map((signal) => (
                <article className={`signal-card p${signal.priority} ${read.includes(signal.id) ? "is-read" : ""}`} key={signal.id}>
                  <div className="priority-rail"><strong>P{signal.priority}</strong><span /></div>
                  <div className="signal-body">
                    <div className="signal-meta">
                      <span className="actor-tag">{signal.actor}</span>
                      {signal.official && <span className="official-tag">官方披露</span>}
                      <span>{signal.source}</span><time>{relativeTime(signal.publishedAt)}</time>
                    </div>
                    <a href={signal.url} target="_blank" rel="noreferrer" onClick={() => openSignal(signal)}><h3>{signal.title}</h3></a>
                    <p><span>排序原因</span>{signal.reason}</p>
                  </div>
                  <button className={`save-button ${saved.includes(signal.id) ? "is-saved" : ""}`} onClick={() => toggleSaved(signal.id)} aria-label={saved.includes(signal.id) ? "取消收藏" : "收藏"}>
                    {saved.includes(signal.id) ? "★" : "☆"}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state"><strong>这一层暂时没有新信号</strong><p>换一个优先级或关注标的看看；系统不会为了填满列表而编造消息。</p></div>
          )}
        </section>

        <aside className="pulse-panel">
          <div className="section-heading"><span>03</span><div><h2>指数脉冲</h2><p>延迟行情 · 仅作观察</p></div></div>
          <div className="index-stack">
            {indices.map((quote, index) => (
              <div className="index-card" key={quote.id}>
                <div><span>0{index + 1}</span><small>{quote.market}</small></div>
                <h3>{quote.name}</h3><strong>{displayNumber(quote.value)}</strong>
                <p className={(quote.changePct ?? 0) >= 0 ? "positive" : "negative"}>{(quote.changePct ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(quote.changePct ?? 0).toFixed(2)}%</p>
                <div className="micro-chart" aria-hidden="true">
                  {[35, 52, 44, 68, 58, 76, 72, 88].map((height, point) => <i key={point} style={{ height: `${height}%` }} />)}
                </div>
              </div>
            ))}
            {!loading && indices.length === 0 && <div className="index-unavailable">指数数据暂时不可用</div>}
          </div>
          <div className="source-panel">
            <h3>一手来源快捷入口</h3><p>重要消息请回到监管披露原文核对。</p>
            <div>{sourceLinks.map((source) => <a href={source.href} target="_blank" rel="noreferrer" key={source.label}>{source.label}<span>↗</span></a>)}</div>
          </div>
          <div className="saved-summary">
            <span>本机已收藏</span><strong>{saved.length.toString().padStart(2, "0")}</strong><p>收藏与已读状态只保存在你的浏览器里。</p>
          </div>
        </aside>
      </div>

      <footer>
        <span>前哨 v0.1 · 数据可能延迟</span>
        <p>本工具仅用于信息整理，不构成投资建议。交易前请核对官方披露并独立判断。</p>
        {unavailable.length > 0 && <span>{unavailable.length} 个行情源暂不可用</span>}
      </footer>
    </main>
  );
}
