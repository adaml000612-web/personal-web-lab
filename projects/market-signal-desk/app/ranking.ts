import type { Priority, RawSignal, Signal } from "./market-config";

const priorityBase: Record<Priority, number> = { 1: 60, 2: 45, 3: 30, 4: 15 };
const sourceTrust: Record<string, number> = {
  "SEC EDGAR": 15,
  "腾讯投资者关系": 14,
  "东方财富公告索引": 9,
  "Nasdaq RSS": 8,
};

function freshnessScore(publishedAt: string, now: number) {
  const ageHours = Math.max(0, (now - new Date(publishedAt).getTime()) / 3_600_000);
  if (ageHours <= 6) return 12;
  if (ageHours <= 24) return 10;
  if (ageHours <= 72) return 7;
  if (ageHours <= 168) return 4;
  return 1;
}

function rankSignal(signal: RawSignal, now: number): Signal {
  const freshness = freshnessScore(signal.publishedAt, now);
  const trust = sourceTrust[signal.source] ?? 5;
  const official = signal.official ? 10 : 0;
  const focus = Math.max(2, 8 - (signal.targets.length - 1) * 2);
  const score = Math.min(99, priorityBase[signal.priority] + freshness + trust + official + focus);
  const factors = [
    `P${signal.priority} 关系层级`,
    signal.official ? "官方披露" : "公开信息源",
    signal.targets.length === 1 ? "单一标的强关联" : `关联 ${signal.targets.length} 个关注标的`,
    freshness >= 10 ? "24 小时内" : freshness >= 7 ? "3 天内" : "历史信号",
  ];
  return { ...signal, score, factors };
}

function fingerprint(title: string) {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "").slice(0, 100);
}

export function rankSignals(rawSignals: RawSignal[], now = Date.now()) {
  const bestByHeadline = new Map<string, Signal>();
  rawSignals.map((signal) => rankSignal(signal, now)).forEach((signal) => {
    const key = fingerprint(signal.title);
    const current = bestByHeadline.get(key);
    if (!current || signal.score > current.score) bestByHeadline.set(key, signal);
  });
  return [...bestByHeadline.values()].sort((a, b) =>
    a.priority - b.priority ||
    b.score - a.score ||
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}
