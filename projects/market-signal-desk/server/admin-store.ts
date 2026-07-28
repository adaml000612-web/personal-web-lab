import { decryptSecret, encryptSecret } from "./admin-crypto";
import { adminSchema } from "../db/schema";

export type DefaultAiConfig = {
  enabled: boolean;
  provider: "deepseek";
  model: "deepseek-v4-flash" | "deepseek-v4-pro";
  apiKey: string;
  updatedAt: string | null;
};

type StoredAiConfig = Omit<DefaultAiConfig, "apiKey"> & {
  encryptedApiKey: string;
};

type MetricInput = {
  route: string;
  status: number;
  durationMs: number;
  kind?: "page" | "api" | "ai";
  message?: string;
};

async function database() {
  const { env } = await import("cloudflare:workers");
  return (env as unknown as { DB: D1Database }).DB;
}

export async function ensureAdminTables(db?: D1Database) {
  const resolvedDb = db ?? await database();
  await resolvedDb.batch([
    resolvedDb.prepare(adminSchema.metrics),
    resolvedDb.prepare(adminSchema.errors),
    resolvedDb.prepare(adminSchema.config),
    resolvedDb.prepare(adminSchema.errorIndex),
  ]);
  return resolvedDb;
}

function shanghaiDay(date = new Date()) {
  return new Date(date.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
}

function safeRoute(route: string) {
  return route.replace(/[^\w./-]/g, "").slice(0, 120) || "/";
}

export async function recordMetric(input: MetricInput) {
  try {
    const db = await ensureAdminTables();
    const route = safeRoute(input.route);
    const kind = input.kind ?? (route.startsWith("/api/") ? "api" : "page");
    const statusGroup = `${Math.min(5, Math.max(1, Math.floor(input.status / 100)))}xx`;
    const duration = Math.min(120_000, Math.max(0, Math.round(input.durationMs)));
    await db.prepare(`INSERT INTO admin_metrics (day, route, kind, status_group, count, total_ms)
      VALUES (?, ?, ?, ?, 1, ?)
      ON CONFLICT(day, route, kind, status_group)
      DO UPDATE SET count = count + 1, total_ms = total_ms + excluded.total_ms`)
      .bind(shanghaiDay(), route, kind, statusGroup, duration)
      .run();

    if (input.status >= 400) {
      await db.prepare(`INSERT INTO admin_errors
        (happened_at, route, status, duration_ms, message)
        VALUES (?, ?, ?, ?, ?)`)
        .bind(
          new Date().toISOString(),
          route,
          input.status,
          duration,
          (input.message ?? "请求返回异常状态").slice(0, 240),
        )
        .run();
      await db.prepare("DELETE FROM admin_errors WHERE id NOT IN (SELECT id FROM admin_errors ORDER BY id DESC LIMIT 200)").run();
    }
  } catch {
    // Monitoring must never break the public site.
  }
}

export async function recordAiMetric(provider: string, model: string, status: number, durationMs: number) {
  await recordMetric({
    route: `${provider}/${model}`,
    status,
    durationMs,
    kind: "ai",
    message: status >= 400 ? "模型调用失败" : undefined,
  });
}

export async function getAdminOverview() {
  const db = await ensureAdminTables();
  const since = shanghaiDay(new Date(Date.now() - 6 * 86_400_000));
  const [metrics, errors] = await Promise.all([
    db.prepare(`SELECT day, route, kind, status_group, SUM(count) AS count, SUM(total_ms) AS total_ms
      FROM admin_metrics WHERE day >= ?
      GROUP BY day, route, kind, status_group ORDER BY day ASC`)
      .bind(since)
      .all<{ day: string; route: string; kind: string; status_group: string; count: number; total_ms: number }>(),
    db.prepare(`SELECT id, happened_at, route, status, duration_ms, message
      FROM admin_errors ORDER BY id DESC LIMIT 20`)
      .all<{ id: number; happened_at: string; route: string; status: number; duration_ms: number; message: string }>(),
  ]);
  const today = shanghaiDay();
  const rows = (metrics.results ?? []).filter(({ route }) => !route.endsWith(".rsc"));
  const todayRows = rows.filter(({ day }) => day === today);
  const sum = (kind: string) => todayRows.filter((row) => row.kind === kind).reduce((total, row) => total + row.count, 0);
  const averageFor = (kind: string) => {
    const kindRows = todayRows.filter((row) => row.kind === kind);
    const count = kindRows.reduce((total, row) => total + row.count, 0);
    const duration = kindRows.reduce((total, row) => total + row.total_ms, 0);
    return count ? Math.round(duration / count) : 0;
  };
  const todayTotal = todayRows.reduce((total, row) => total + row.count, 0);
  const todayDuration = todayRows.reduce((total, row) => total + row.total_ms, 0);
  const todayErrors = todayRows.filter(({ status_group }) => status_group === "4xx" || status_group === "5xx")
    .reduce((total, row) => total + row.count, 0);

  const days = Array.from({ length: 7 }, (_, index) =>
    shanghaiDay(new Date(Date.now() - (6 - index) * 86_400_000)));
  const trend = days.map((day) => {
    const dayRows = rows.filter((row) => row.day === day);
    return {
      day,
      pageviews: dayRows.filter(({ kind }) => kind === "page").reduce((total, row) => total + row.count, 0),
      apiCalls: dayRows.filter(({ kind }) => kind === "api").reduce((total, row) => total + row.count, 0),
      aiCalls: dayRows.filter(({ kind }) => kind === "ai").reduce((total, row) => total + row.count, 0),
      errors: dayRows.filter(({ status_group }) => status_group === "4xx" || status_group === "5xx")
        .reduce((total, row) => total + row.count, 0),
    };
  });
  const endpointMap = new Map<string, { route: string; kind: string; count: number; errors: number; totalMs: number }>();
  for (const row of todayRows) {
    const key = `${row.kind}:${row.route}`;
    const current = endpointMap.get(key) ?? { route: row.route, kind: row.kind, count: 0, errors: 0, totalMs: 0 };
    current.count += row.count;
    current.totalMs += row.total_ms;
    if (row.status_group === "4xx" || row.status_group === "5xx") current.errors += row.count;
    endpointMap.set(key, current);
  }
  const endpoints = Array.from(endpointMap.values())
    .map(({ totalMs, ...endpoint }) => ({
      ...endpoint,
      averageMs: endpoint.count ? Math.round(totalMs / endpoint.count) : 0,
    }))
    .sort((left, right) => right.averageMs - left.averageMs)
    .slice(0, 8);

  return {
    today: {
      pageviews: sum("page"),
      apiCalls: sum("api"),
      aiCalls: sum("ai"),
      errors: todayErrors,
      errorRate: todayTotal ? todayErrors / todayTotal : 0,
      averageMs: todayTotal ? Math.round(todayDuration / todayTotal) : 0,
      pageAverageMs: averageFor("page"),
      apiAverageMs: averageFor("api"),
      aiAverageMs: averageFor("ai"),
    },
    trend,
    endpoints,
    errors: errors.results ?? [],
  };
}

export async function readDefaultAiConfig(): Promise<DefaultAiConfig | null> {
  try {
    const db = await ensureAdminTables();
    const row = await db.prepare("SELECT value, updated_at FROM admin_config WHERE key = 'default_ai'")
      .first<{ value: string; updated_at: string }>();
    if (!row) return null;
    const stored = JSON.parse(row.value) as StoredAiConfig;
    return {
      enabled: stored.enabled === true,
      provider: "deepseek",
      model: stored.model === "deepseek-v4-pro" ? "deepseek-v4-pro" : "deepseek-v4-flash",
      apiKey: stored.encryptedApiKey ? await decryptSecret(stored.encryptedApiKey) : "",
      updatedAt: row.updated_at,
    };
  } catch {
    return null;
  }
}

export async function publicDefaultAiConfig() {
  const config = await readDefaultAiConfig();
  return {
    enabled: config?.enabled ?? false,
    provider: "deepseek" as const,
    model: config?.model ?? "deepseek-v4-flash" as const,
    hasApiKey: Boolean(config?.apiKey),
    updatedAt: config?.updatedAt ?? null,
  };
}

export async function saveDefaultAiConfig(input: {
  enabled: boolean;
  model: DefaultAiConfig["model"];
  apiKey?: string;
  clearApiKey?: boolean;
}) {
  const db = await ensureAdminTables();
  const current = await readDefaultAiConfig();
  const apiKey = input.clearApiKey ? "" : input.apiKey?.trim() || current?.apiKey || "";
  const stored: StoredAiConfig = {
    enabled: input.enabled,
    provider: "deepseek",
    model: input.model,
    encryptedApiKey: apiKey ? await encryptSecret(apiKey) : "",
    updatedAt: new Date().toISOString(),
  };
  await db.prepare(`INSERT INTO admin_config (key, value, updated_at)
    VALUES ('default_ai', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .bind(JSON.stringify(stored), stored.updatedAt)
    .run();
  return publicDefaultAiConfig();
}

export async function clearDefaultAiKey() {
  const current = await readDefaultAiConfig();
  return saveDefaultAiConfig({
    enabled: false,
    model: current?.model ?? "deepseek-v4-flash",
    clearApiKey: true,
  });
}
