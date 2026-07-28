// D1 schema source of truth. Runtime initialization mirrors these statements
// so a fresh preview and a newly provisioned deployment behave identically.
export const adminSchema = {
  metrics: `CREATE TABLE IF NOT EXISTS admin_metrics (
    day TEXT NOT NULL,
    route TEXT NOT NULL,
    kind TEXT NOT NULL,
    status_group TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    total_ms INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, route, kind, status_group)
  )`,
  errors: `CREATE TABLE IF NOT EXISTS admin_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    happened_at TEXT NOT NULL,
    route TEXT NOT NULL,
    status INTEGER NOT NULL,
    method TEXT NOT NULL DEFAULT '',
    duration_ms INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL DEFAULT ''
  )`,
  config: `CREATE TABLE IF NOT EXISTS admin_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  errorIndex: "CREATE INDEX IF NOT EXISTS admin_errors_time_idx ON admin_errors(happened_at DESC)",
} as const;
