"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Overview = {
  today: {
    pageviews: number;
    apiCalls: number;
    aiCalls: number;
    errors: number;
    errorRate: number;
    averageMs: number;
    pageAverageMs: number;
    apiAverageMs: number;
    aiAverageMs: number;
  };
  trend: Array<{
    day: string;
    pageviews: number;
    apiCalls: number;
    aiCalls: number;
    errors: number;
  }>;
  endpoints: Array<{
    route: string;
    kind: string;
    count: number;
    errors: number;
    averageMs: number;
  }>;
  errors: Array<{
    id: number;
    happened_at: string;
    route: string;
    status: number;
    duration_ms: number;
    message: string;
  }>;
};

type ModelStatus = {
  enabled: boolean;
  provider: "deepseek";
  model: "deepseek-v4-flash" | "deepseek-v4-pro";
  hasApiKey: boolean;
  updatedAt: string | null;
};

export type DashboardData = { overview: Overview; model: ModelStatus };

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}

export function AdminConsole({
  administrator,
  signOutPath,
  initialData,
}: {
  administrator: string;
  signOutPath: string | null;
  initialData: DashboardData;
}) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      if (!response.ok) throw new Error("后台数据读取失败");
      setData(await response.json());
      setNotice("");
    } catch {
      setNotice("暂时无法读取运行数据，请稍后刷新。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const maximumTraffic = useMemo(() =>
    Math.max(1, ...data.overview.trend.map(({ pageviews, apiCalls }) => pageviews + apiCalls)),
  [data.overview.trend]);

  async function saveModel() {
    setSaving(true);
    setNotice("正在验证 DeepSeek 连接…");
    try {
      const response = await fetch("/api/admin/model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Action": "frontier-admin",
        },
        body: JSON.stringify({
          action: "save",
          enabled: data.model.enabled,
          model: data.model.model,
          apiKey: apiKey.trim() || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存失败");
      setData((current) => ({ ...current, model: result.model }));
      setApiKey("");
      setNotice(result.message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function clearKey() {
    if (!window.confirm("确定清除默认 DeepSeek API Key 吗？清除后智能体会退回数据分析模式。")) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Action": "frontier-admin",
        },
        body: JSON.stringify({ action: "clear" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "清除失败");
      setData((current) => ({ ...current, model: result.model }));
      setApiKey("");
      setNotice(result.message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "清除失败");
    } finally {
      setSaving(false);
    }
  }

  const statusHealthy = data.overview.today.errors === 0;

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/">
          <span>前哨</span>
          <strong>CONTROL ROOM</strong>
        </Link>
        <div className="admin-account">
          <span className={statusHealthy ? "is-healthy" : "is-warning"} />
          <div><small>管理员</small><strong>{administrator}</strong></div>
          {signOutPath && <a href={signOutPath}>安全退出</a>}
        </div>
      </header>

      <section className="admin-hero">
        <div>
          <p>PRIVATE OPERATIONS</p>
          <h1>网站现在，<br />运行得怎么样？</h1>
          <span>每 30 秒自动更新。这里只保存聚合统计，不记录访客姓名、邮箱或完整 IP。</span>
        </div>
        <button type="button" onClick={refresh} disabled={loading}>
          <i />{loading ? "正在同步" : "立即刷新"}
        </button>
      </section>

      {notice && <div className="admin-notice" role="status">{notice}</div>}

      <section className="admin-metrics" aria-label="今日运行数据">
        <article><span>01</span><small>今日页面访问</small><strong>{data.overview.today.pageviews}</strong><em>次页面请求</em></article>
        <article><span>02</span><small>接口调用</small><strong>{data.overview.today.apiCalls}</strong><em>行情、新闻与搜索</em></article>
        <article><span>03</span><small>智能体调用</small><strong>{data.overview.today.aiCalls}</strong><em>真实模型请求</em></article>
        <article className={data.overview.today.errors ? "has-error" : ""}>
          <span>04</span><small>异常请求</small><strong>{data.overview.today.errors}</strong>
          <em>{(data.overview.today.errorRate * 100).toFixed(1)}% 错误率</em>
        </article>
        <article>
          <span>05</span><small>页面响应</small><strong>{data.overview.today.pageAverageMs}</strong>
          <em>接口平均 {data.overview.today.apiAverageMs} ms</em>
        </article>
      </section>

      <div className="admin-grid">
        <section className="admin-card admin-trend">
          <header><div><small>7 DAY PULSE</small><h2>近七天流量</h2></div><span>页面 + 接口</span></header>
          <div className="admin-bars">
            {data.overview.trend.map((item) => {
              const total = item.pageviews + item.apiCalls;
              return (
                <div className="admin-bar-day" key={item.day}>
                  <div className="admin-bar-track">
                    <i style={{ height: `${Math.max(4, total / maximumTraffic * 100)}%` }} />
                    {item.errors > 0 && <b title={`${item.errors} 个错误`} />}
                  </div>
                  <strong>{total}</strong>
                  <span>{item.day.slice(5)}</span>
                </div>
              );
            })}
          </div>
          {!data.overview.trend.length && <p className="admin-empty">监控刚启用，访问网站后这里会逐步出现趋势。</p>}
        </section>

        <section className="admin-card admin-model">
          <header>
            <div><small>DEFAULT INTELLIGENCE</small><h2>默认大模型</h2></div>
            <span className={data.model.enabled && data.model.hasApiKey ? "model-live" : "model-off"}>
              {data.model.enabled && data.model.hasApiKey ? "已启用" : "未启用"}
            </span>
          </header>
          <label className="admin-switch-row">
            <span><strong>启用真实 AI</strong><small>关闭后自动退回网站的数据分析能力</small></span>
            <input
              type="checkbox"
              checked={data.model.enabled}
              onChange={(event) => setData((current) => ({
                ...current,
                model: { ...current.model, enabled: event.target.checked },
              }))}
            />
          </label>
          <label className="admin-field">
            <span>模型</span>
            <select
              value={data.model.model}
              onChange={(event) => setData((current) => ({
                ...current,
                model: {
                  ...current.model,
                  model: event.target.value as ModelStatus["model"],
                },
              }))}
            >
              <option value="deepseek-v4-flash">DeepSeek V4 Flash · 快速省钱</option>
              <option value="deepseek-v4-pro">DeepSeek V4 Pro · 深度分析</option>
            </select>
          </label>
          <label className="admin-field">
            <span>DeepSeek API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="new-password"
              spellCheck={false}
              maxLength={512}
              placeholder={data.model.hasApiKey ? "已加密保存，输入新密钥可替换" : "粘贴 DeepSeek API Key"}
            />
          </label>
          <p className="admin-key-state">
            <i className={data.model.hasApiKey ? "is-ready" : ""} />
            {data.model.hasApiKey ? "密钥已加密保存，页面不会回显完整内容" : "尚未保存密钥"}
          </p>
          <div className="admin-model-actions">
            <button type="button" onClick={saveModel} disabled={saving}>
              {saving ? "正在验证…" : "测试连接并保存"}
            </button>
            {data.model.hasApiKey && <button type="button" onClick={clearKey} disabled={saving}>清除密钥</button>}
          </div>
        </section>
      </div>

      <section className="admin-card admin-performance">
        <header>
          <div><small>RESPONSE BREAKDOWN</small><h2>响应时间拆解</h2></div>
          <span>今日 · 慢项优先</span>
        </header>
        {data.overview.endpoints.length ? (
          <div className="admin-performance-list">
            {data.overview.endpoints.map((endpoint) => (
              <div className="admin-performance-row" key={`${endpoint.kind}:${endpoint.route}`}>
                <span className={`admin-kind admin-kind-${endpoint.kind}`}>
                  {endpoint.kind === "page" ? "页面" : endpoint.kind === "ai" ? "AI" : "接口"}
                </span>
                <strong>{endpoint.route}</strong>
                <span>{endpoint.count} 次</span>
                <b className={endpoint.averageMs > 1_000 ? "is-slow" : endpoint.averageMs > 400 ? "is-medium" : "is-fast"}>
                  {endpoint.averageMs} ms
                </b>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-empty">今天还没有足够的响应数据。</p>
        )}
      </section>

      <section className="admin-card admin-errors">
        <header>
          <div><small>INCIDENT FEED</small><h2>最近异常</h2></div>
          <span>{data.overview.errors.length ? `${data.overview.errors.length} 条` : "运行正常"}</span>
        </header>
        {data.overview.errors.length ? (
          <div className="admin-error-table">
            <div className="admin-error-head"><span>时间</span><span>位置</span><span>状态</span><span>耗时</span><span>说明</span></div>
            {data.overview.errors.map((error) => (
              <div className="admin-error-row" key={error.id}>
                <time>{formatTime(error.happened_at)}</time>
                <strong>{error.route}</strong>
                <b>{error.status}</b>
                <span>{error.duration_ms} ms</span>
                <span>{error.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-all-clear"><i /><div><strong>暂未发现异常</strong><span>出现 4xx、5xx 或模型调用失败时，会记录在这里。</span></div></div>
        )}
      </section>

      <footer className="admin-footer">
        <span>前哨管理台 · 仅管理员可见</span>
        <Link href="/">返回网站首页 ↗</Link>
      </footer>
    </main>
  );
}
