"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { MarketAgentPanel } from "./market-agent-panel";
import { indexOrder, sourceLinks, watchlist, type Quote, type Signal } from "./market-config";
import { SETTINGS_STORAGE_KEY, defaultSettings, sanitizeSettings, type AppSettings, type MainModule } from "./settings";
import { signalTime } from "./signal-presentation";
import { SignalTitle } from "./signal-title";

const BeginnerMarket = lazy(() =>
  import("./beginner-market").then(({ BeginnerMarket: Component }) => ({ default: Component })));
const SettingsPanel = lazy(() =>
  import("./settings-panel").then(({ SettingsPanel: Component }) => ({ default: Component })));

const priorityLabels = {
  1: "公司与官方披露",
  2: "板块与产业链",
  3: "市场指数",
  4: "海外映射",
} as const;
const priorityShortLabels = ["", "公司披露", "产业链", "市场指数", "海外映射"] as const;
const moduleLabels: Record<MainModule, string> = { radar: "情报雷达", prices: "行情入门" };

function displayNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function followPointer(event: ReactPointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
}

function tiltCard(event: ReactPointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - .5;
  const y = (event.clientY - rect.top) / rect.height - .5;
  event.currentTarget.style.setProperty("--tilt-x", `${(-y * 3.5).toFixed(2)}deg`);
  event.currentTarget.style.setProperty("--tilt-y", `${(x * 4.5).toFixed(2)}deg`);
}

function resetTilt(event: ReactPointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty("--tilt-x", "0deg");
  event.currentTarget.style.setProperty("--tilt-y", "0deg");
}

function randomUnit(seed: number) {
  let value = seed + 0x6d2b79f5;
  value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
}

function createRadarSeed() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0];
}

function radarEchoStyle(priority: number, index: number, seed: number) {
  const rings = {
    1: [12, 23],
    2: [24, 33],
    3: [34, 41],
    4: [42, 48],
  } as const;
  const [inner, outer] = rings[priority as keyof typeof rings] ?? rings[4];
  const echoSeed = seed ^ Math.imul(priority + 1, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b);
  const radius = inner + randomUnit(echoSeed) * (outer - inner);
  const segment = 360 / 7;
  const ringOffset = randomUnit(seed ^ Math.imul(priority, 0x27d4eb2d)) * 360;
  const jitter = (randomUnit(echoSeed ^ 0xc2b2ae35) - .5) * segment * .72;
  const angleDegrees = (ringOffset + index * segment + jitter + 360) % 360;
  const angle = angleDegrees * Math.PI / 180;
  const sweepDelay = (((angleDegrees + 110) % 360) / 360) * 8;
  return {
    left: `${50 + Math.cos(angle) * radius}%`,
    top: `${50 + Math.sin(angle) * radius}%`,
    "--echo-delay": `${sweepDelay.toFixed(2)}s`,
    "--echo-size": `${7 + Math.round((index * 3 + priority) % 5)}px`,
  } as CSSProperties;
}

export function MarketDashboard() {
  const [module, setModule] = useState<"home" | "signals" | "prices">("home");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState("all");
  const [priority, setPriority] = useState<number | "all">("all");
  const [saved, setSaved] = useState<string[]>([]);
  const [read, setRead] = useState<string[]>([]);
  const [expandedSignal, setExpandedSignal] = useState("");
  const [focusedSymbol, setFocusedSymbol] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const [radarSeed, setRadarSeed] = useState(0);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [settingsReady, setSettingsReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSaved(JSON.parse(localStorage.getItem("msd-saved") ?? "[]"));
        setRead(JSON.parse(localStorage.getItem("msd-read") ?? "[]"));
        const marketCache = JSON.parse(localStorage.getItem("msd-market-cache") ?? "null");
        const newsCache = JSON.parse(localStorage.getItem("msd-news-cache") ?? "null");
        if (Array.isArray(marketCache?.items)) {
          setQuotes(marketCache.items);
          setUnavailable(marketCache.unavailable ?? []);
          setLastUpdated(new Date(marketCache.fetchedAt));
        }
        if (Array.isArray(newsCache?.signals)) {
          setSignals(newsCache.signals);
          setLastUpdated(new Date(newsCache.fetchedAt));
          setLoading(false);
        }
      } catch {
        localStorage.removeItem("msd-saved");
        localStorage.removeItem("msd-read");
        localStorage.removeItem("msd-market-cache");
        localStorage.removeItem("msd-news-cache");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSettings(sanitizeSettings(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "null")));
      } catch {
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
      } finally {
        setSettingsReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings, settingsReady]);

  useEffect(() => {
    const currentMainModule: MainModule = module === "prices" ? "prices" : "radar";
    if (settings.mainModules.includes(currentMainModule)) return;
    const timer = window.setTimeout(() => {
      setModule(settings.mainModules[0] === "prices" ? "prices" : "home");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [module, settings.mainModules]);

  const loadData = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
      setRadarSeed(createRadarSeed());
    }
    setError("");
    try {
      const cacheMode: RequestCache = manual ? "no-store" : "default";
      const refreshQuery = manual ? `?refresh=${Date.now()}` : "";
      const marketTask = (async () => {
        const response = await fetch(`/api/market${refreshQuery}`, { cache: cacheMode });
        if (!response.ok) throw new Error("行情服务暂时不可用");
        const data = await response.json();
        setQuotes(data.items ?? []);
        setUnavailable(data.unavailable ?? []);
        setLastUpdated(new Date(data.fetchedAt ?? Date.now()));
        localStorage.setItem("msd-market-cache", JSON.stringify(data));
      })();
      const newsTask = (async () => {
        const response = await fetch(`/api/news${refreshQuery}`, { cache: cacheMode });
        if (!response.ok) throw new Error("新闻服务暂时不可用");
        const data = await response.json();
        setSignals(data.signals ?? []);
        setLastUpdated(new Date(data.fetchedAt ?? Date.now()));
        localStorage.setItem("msd-news-cache", JSON.stringify(data));
      })();
      const results = await Promise.allSettled([marketTask, newsTask]);
      if (results.every(({ status }) => status === "rejected")) throw new Error("数据服务暂时不可用");
    } catch {
      setError("暂时没有拉到最新数据，请稍后再刷新。页面不会用虚构数据填充。");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRadarSeed(createRadarSeed());
      void loadData();
    }, 0);
    const interval = window.setInterval(() => {
      setRadarSeed(createRadarSeed());
      setScanCount((current) => {
        const next = (current + 1) % 5;
        if (next === 0) void loadData(true);
        return next;
      });
    }, 8_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [loadData]);

  const quoteMap = useMemo(() => new Map(quotes.map((quote) => [quote.id, quote])), [quotes]);
  const { indices, stocks } = useMemo(() => ({
    indices: indexOrder.map((id) => quoteMap.get(id)).filter((quote): quote is Quote => Boolean(quote)),
    stocks: quotes.filter(({ type }) => type === "stock"),
  }), [quoteMap, quotes]);
  const readSet = useMemo(() => new Set(read), [read]);
  const savedSet = useMemo(() => new Set(saved), [saved]);
  const {
    priorityCounts,
    unreadCount,
    radarEchoes,
    signalCountsByTarget,
  } = useMemo(() => {
    const counts = [0, 0, 0, 0];
    const echoes: Signal[][] = [[], [], [], []];
    const targetCounts = new Map<string, number>();
    let unreadSignals = 0;

    for (const signal of signals) {
      const priorityIndex = signal.priority - 1;
      counts[priorityIndex] += 1;
      if (echoes[priorityIndex].length < 7) echoes[priorityIndex].push(signal);
      if (!readSet.has(signal.id)) unreadSignals += 1;
      for (const target of signal.targets) {
        targetCounts.set(target, (targetCounts.get(target) ?? 0) + 1);
      }
    }

    return {
      priorityCounts: counts,
      unreadCount: unreadSignals,
      radarEchoes: echoes.flat(),
      signalCountsByTarget: targetCounts,
    };
  }, [readSet, signals]);

  const filteredSignals = useMemo(() => {
    return signals.filter((signal) =>
      (selected === "all" || signal.targets.includes(selected)) &&
      (priority === "all" || signal.priority === priority));
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

  const dataTimestamp = lastUpdated?.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  function openSignalLayer(level: number | "all") {
    setPriority(level);
    setSelected("all");
    setModule("signals");
    window.setTimeout(() => document.querySelector("#signal-feed")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  function openStock(symbol: string) {
    setFocusedSymbol(symbol);
    setModule("prices");
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }

  function openRadarEcho(signal: Signal) {
    setPriority(signal.priority);
    setSelected(signal.targets[0] ?? "all");
    setExpandedSignal(signal.id);
    openSignal(signal);
    setModule("signals");
    window.setTimeout(() => document.querySelector("#signal-feed")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  const changeSettings = useCallback((next: AppSettings) => {
    setSettings(sanitizeSettings(next));
  }, []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const shellStyle = {
    "--iris": settings.primaryColor,
    "--iris-bright": settings.primaryColor,
    "--mint": settings.primaryColor,
    "--cyan": settings.secondaryColor,
    "--pink": settings.secondaryColor,
    "--font-floor": `${settings.fontSize}px`,
  } as CSSProperties;

  return (
    <main className="app-shell cosmic-shell" style={shellStyle} onPointerMove={followPointer}>
      <div className="ambient-field" aria-hidden="true"><i /><i /><i /></div>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="前哨首页" onClick={() => setModule("home")}>
          <span className="brand-tiles" aria-hidden="true"><i>前</i><i>哨</i></span>
          <span className="brand-scope"><strong>沪 · 港 · 美</strong><small>市场信号台</small></span>
        </a>
        <nav className="module-nav" aria-label="应用板块">
          {settings.mainModules.map((item) => (
            <button
              className={item === "radar" ? module === "home" || module === "signals" ? "is-active" : "" : module === "prices" ? "is-active" : ""}
              key={item}
              onClick={() => setModule(item === "radar" ? "home" : "prices")}
            >
              <span>{moduleLabels[item]}</span>
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <div className="market-clock" aria-label="数据状态">
            <span className={error ? "status-dot status-dot--warn" : "status-dot"} />
            <span>{dataTimestamp ? `抓取于 ${dataTimestamp} · 雷达每 5 圈更新` : "正在连接数据源"}</span>
          </div>
          <button className="refresh-button" onClick={() => void loadData(true)} disabled={refreshing}>
            <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"} aria-hidden="true">↻</span>
            {refreshing ? "刷新中" : module === "prices" ? "刷新行情" : "立即扫描"}
          </button>
          <button className="settings-button" type="button" onClick={() => setSettingsOpen(true)} aria-haspopup="dialog" aria-label="打开基础设置">
            <span aria-hidden="true">✦</span><b>设置</b>
          </button>
        </div>
      </header>

      {settings.showPulse && <section className="market-pulse" aria-label="主要市场脉冲">
        <div className="pulse-live">
          <span className={error ? "status-dot status-dot--warn" : "status-dot"} />
          <strong>{error ? "数据延迟" : "LIVE PULSE"}</strong>
        </div>
        <div className="pulse-window">
          <div className="pulse-track">
            {indices.length ? [0, 1].map((copy) => (
              <div className="pulse-group" key={copy} aria-hidden={copy === 1}>
                {indices.map((quote) => (
                  <span className="pulse-quote" key={`${quote.id}-${copy}`}>
                    <b>{quote.name}</b>
                    <span>{displayNumber(quote.value)}</span>
                    <i className={(quote.changePct ?? 0) >= 0 ? "positive" : "negative"}>
                      {(quote.changePct ?? 0) >= 0 ? "+" : ""}{quote.changePct?.toFixed(2)}%
                    </i>
                  </span>
                ))}
              </div>
            )) : <span className="pulse-placeholder">正在连接沪、港、美三地市场</span>}
          </div>
        </div>
        <span className="pulse-stamp">{lastUpdated ? lastUpdated.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</span>
      </section>}

      {module === "home" ? (
        <section className="radar-home" id="top">
          <div className="radar-intro">
            <p className="eyebrow"><span /> TODAY&apos;S SIGNAL MAP</p>
            <h1>今日重点</h1>
            <p className="radar-intro-copy">越靠前，与你关注的公司越直接。选择一层，查看今天值得处理的信号。</p>
            <div className="radar-summary" aria-label="今日情报摘要">
              <span><strong>{signals.length}</strong><small>全部信号</small></span>
              <span><strong>{priorityCounts[0]}</strong><small>公司级</small></span>
              <span><strong>{unreadCount}</strong><small>尚未阅读</small></span>
            </div>
            <div className="priority-launchpad" aria-label="按信号距离进入情报">
              {([1, 2, 3, 4] as const).map((level, index) => (
                <button className={`priority-launch priority-launch-p${level}`} key={level} onClick={() => openSignalLayer(level)}>
                  <i /><span><small>P{level}</small><strong>{priorityShortLabels[level]}</strong></span>
                  <b>{priorityCounts[index]}</b><em>↗</em>
                </button>
              ))}
            </div>
            <div className="scan-progress" aria-live="polite">
              <span className={refreshing ? "scan-beacon is-refreshing" : "scan-beacon"} />
              <strong>{refreshing ? "正在刷新最新情报" : `第 ${scanCount + 1} / 5 圈`}</strong>
              <small>每 5 圈自动刷新新闻</small>
            </div>
          </div>

          <div className="true-radar" key={`${lastUpdated?.getTime() ?? "radar-loading"}-${radarSeed}`} aria-label={`实时情报雷达，共发现 ${signals.length} 条信号`}>
            <div className="radar-grid" aria-hidden="true" />
            <div className="radar-range-pulses" aria-hidden="true"><i /><i /><i /></div>
            <div className="radar-sweep" aria-hidden="true" />
            <div className="radar-afterglow" aria-hidden="true" />
            {radarEchoes.map((signal, index) => (
              <button
                className={`radar-echo radar-echo-p${signal.priority} radar-echo-hold-${3 + (index % 3)}`}
                key={signal.id}
                style={radarEchoStyle(signal.priority, index, radarSeed)}
                onClick={() => openRadarEcho(signal)}
                aria-label={`打开 P${signal.priority} 情报：${signal.title}`}
                title={`P${signal.priority} · ${signal.actor}`}
              />
            ))}
            <button className="radar-core" onClick={() => openSignalLayer("all")} aria-label={`进入全部情报，共 ${signals.length} 条`}>
              <span>扫描中</span><strong>{signals.length.toString().padStart(2, "0")}</strong><small>已捕获回波</small>
            </button>
            <span className="radar-bearing bearing-n" aria-hidden="true">N</span>
            <span className="radar-bearing bearing-e" aria-hidden="true">E</span>
            <span className="radar-bearing bearing-s" aria-hidden="true">S</span>
            <span className="radar-bearing bearing-w" aria-hidden="true">W</span>
          </div>

          {settings.showStockRail && <div className="home-stock-rail" aria-label="关注股票，连续滚动，悬停暂停">
            <div className="stock-rail-label"><span>WATCHLIST</span><strong>点击查看行情</strong></div>
            <div className="stock-rail-window">
              <div className="stock-rail-track">
                {stocks.length ? [...stocks, ...stocks].map((quote, index) => (
                  <button key={`${quote.id}-${index}`} aria-hidden={index >= stocks.length} tabIndex={index >= stocks.length ? -1 : 0} onClick={() => openStock(quote.symbol)}>
                    <span><strong>{quote.name}</strong><small>{quote.symbol}</small></span>
                    <b className={(quote.changePct ?? 0) >= 0 ? "positive" : "negative"}>
                      {(quote.changePct ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(quote.changePct ?? 0).toFixed(2)}%
                    </b>
                    <i>{displayNumber(quote.value)}</i>
                  </button>
                )) : <span className="pulse-placeholder">正在连接关注股票</span>}
              </div>
            </div>
          </div>}
        </section>
      ) : module === "signals" ? (
        <>
          <header className="detail-header" id="top">
            <button onClick={() => setModule("home")}>← 返回雷达</button>
            <div><p className="eyebrow">INTELLIGENCE DETAIL</p><h1>情报详情</h1><p>从雷达进入后，在这里筛选公司、核对来源和判断依据。</p></div>
            <span>{priority === "all" ? "全部信号" : `P${priority} · ${priorityLabels[priority as keyof typeof priorityLabels]}`}</span>
          </header>

          <section className="watch-orbit" aria-label="我的关注标的">
            <div className="orbit-label"><span>TRACKING</span><strong>我的关注轨道</strong></div>
            <button data-watch-id="all" className={`watch-chip watch-chip--all ${selected === "all" ? "is-active" : ""}`} onClick={() => setSelected("all")}>
              <span>全部</span><strong>{signals.length}</strong>
            </button>
            {watchlist.map((item) => {
              const quote = quoteMap.get(item.id);
              const signalCount = signalCountsByTarget.get(item.id) ?? 0;
              return (
                <button data-watch-id={item.id} className={`watch-chip ${selected === item.id ? "is-active" : ""}`} key={item.id} onClick={() => setSelected(item.id)}>
                  {quote ? (
                    <span className="watch-change">
                      <small>今日涨跌</small>
                      <b className={(quote.changePct ?? 0) >= 0 ? "positive" : "negative"}>
                        {(quote.changePct ?? 0) >= 0 ? "+" : ""}{quote.changePct?.toFixed(2)}%
                      </b>
                    </span>
                  ) : (
                    <span className="watch-change watch-change--loading">
                      <small>今日涨跌</small><b>--</b>
                    </span>
                  )}
                  <span className="watch-company">
                    <span className={`watch-glyph tone-${item.tone}`}>{item.name.slice(0, 1)}</span>
                    <span><strong>{item.name}</strong><small>{item.symbol}</small></span>
                  </span>
                  <span className="watch-signal-count">{signalCount} 条情报</span>
                </button>
              );
            })}
            <div className="future-chip"><span>COMING</span><strong>长鑫存储</strong></div>
          </section>

          <div className="mission-grid" id="signal-feed">
            <section className="signal-panel">
              <div className="section-heading signal-heading">
                <div>
                  <span className="section-kicker">SIGNAL STREAM</span>
                  <h2>今日信号流</h2>
                  <p>{selected === "all" ? "全部关注标的" : watchlist.find((item) => item.id === selected)?.name} · 卡片时间为消息发布时间</p>
                </div>
                <div className="priority-tabs" aria-label="按优先级筛选">
                  {(["all", 1, 2, 3, 4] as const).map((level) => (
                    <button key={level} className={priority === level ? "is-active" : ""} onClick={() => setPriority(level)}>
                      {level === "all" ? "ALL" : `P${level}`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="priority-legend">
                <span><i className="p1" />公司/官方</span><span><i className="p2" />板块/产业链</span>
                <span><i className="p3" />指数</span><span><i className="p4" />海外映射</span>
              </div>

              {error && <div className="data-notice">{error}</div>}
              {loading ? (
                <div className="signal-loading">{[1, 2, 3, 4].map((item) => <span key={item} />)}</div>
              ) : filteredSignals.length ? (
                <div className="signal-list">
                  {filteredSignals.map((signal) => {
                    const expanded = expandedSignal === signal.id;
                    return (
                      <article
                        className={`signal-card p${signal.priority} ${readSet.has(signal.id) ? "is-read" : ""} ${expanded ? "is-expanded" : ""}`}
                        key={signal.id}
                        onPointerMove={tiltCard}
                        onPointerLeave={resetTilt}
                      >
                        <div className="priority-rail"><strong>P{signal.priority}</strong><span /></div>
                        <div className="signal-body">
                          <div className="signal-meta">
                            <span className="actor-tag">{signal.actor}</span>
                            {signal.official && <span className="official-tag">官方披露</span>}
                            <span className="score-tag" title={signal.factors.join(" · ")}>相关度 {signal.score}</span>
                            <span>{signal.source}</span><time dateTime={signal.publishedAt}>{signalTime(signal.publishedAt)}</time>
                          </div>
                          <SignalTitle signal={signal} onOpen={() => openSignal(signal)} />
                          <p><span>排序原因</span>{signal.reason}</p>
                          <div className="signal-controls">
                            <button className="signal-expander" aria-expanded={expanded} onClick={() => setExpandedSignal(expanded ? "" : signal.id)}>
                              {expanded ? "收起判断依据" : "查看判断依据"} <span>{expanded ? "−" : "+"}</span>
                            </button>
                          </div>
                          {expanded && (
                            <div className="signal-insight">
                              <span>WHY IT MATTERS</span>
                              <div>{signal.factors.map((factor) => <i key={factor}>{factor}</i>)}</div>
                            </div>
                          )}
                        </div>
                        <button className={`save-button ${savedSet.has(signal.id) ? "is-saved" : ""}`} onClick={() => toggleSaved(signal.id)} aria-label={savedSet.has(signal.id) ? "取消收藏" : "收藏"}>
                          {savedSet.has(signal.id) ? "★" : "☆"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state"><strong>这一层暂时没有新信号</strong><p>换一个优先级或关注标的看看；系统不会为了填满列表而编造消息。</p></div>
              )}
            </section>

            <aside className="pulse-panel">
              <div className="section-heading"><div><span className="section-kicker">MARKET PULSE</span><h2>指数脉冲</h2><p>延迟行情 · 仅作观察</p></div></div>
              <div className="index-stack">
                {indices.map((quote, index) => (
                  <div className="index-card" key={quote.id} onPointerMove={tiltCard} onPointerLeave={resetTilt}>
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
                <h3>原始信号源</h3><p>重要消息请回到监管披露原文核对。</p>
                <div>{sourceLinks.map(([label, href]) => <a href={href} target="_blank" rel="noreferrer" key={label}>{label}<span>↗</span></a>)}</div>
              </div>
              <div className="saved-summary">
                <span>COLLECTED</span><strong>{saved.length.toString().padStart(2, "0")}</strong><p>本机收藏</p>
              </div>
            </aside>
          </div>
        </>
      ) : (
        <Suspense fallback={<section className="module-loading" aria-live="polite">正在加载行情模块…</section>}>
          <BeginnerMarket
            quotes={quotes}
            loading={loading}
            initialSymbol={focusedSymbol}
            onSelectedSymbolChange={setFocusedSymbol}
          />
        </Suspense>
      )}

      {settings.showAgent && (
        <MarketAgentPanel
          quotes={quotes}
          signals={signals}
          activeSymbol={focusedSymbol || stocks[0]?.symbol}
          modelSettings={{
            mode: settings.modelMode,
            provider: settings.customProvider,
            model: settings.customModel,
          }}
        />
      )}

      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsPanel settings={settings} onChange={changeSettings} onClose={closeSettings} />
        </Suspense>
      )}

      <footer>
          <span>前哨 v2.9.5 · MARKET SIGNAL DESK</span>
        <p>本工具仅用于信息整理，不构成投资建议。交易前请核对官方披露并独立判断。</p>
        {unavailable.length > 0 && <span>{unavailable.length} 个行情源暂不可用</span>}
      </footer>
    </main>
  );
}
