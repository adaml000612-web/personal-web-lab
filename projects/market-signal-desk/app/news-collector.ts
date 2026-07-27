import {
  nasdaqSources,
  topicRules,
  watchedAliases,
  watchlist,
  type Priority,
  type RawSignal,
} from "./market-config.ts";

export type FeedFallback = {
  priority: Priority;
  reason: string;
  actor: string;
  targets: string[];
};

export type FeedMeta = {
  source: string;
  official?: boolean;
  fallback?: FeedFallback;
  preferFallback?: boolean;
  maxItems?: number;
  timeoutMs?: number;
};

const indexPattern = /(nasdaq|s&p\s*500|standard\s*&\s*poor|wall street|stock market|美股|纳斯达克|标普|上证指数|沪指|恒生指数|港股大盘|shanghai composite|hang seng)/i;
const peers = nasdaqSources.filter((source) => "aliases" in source);

function decodeCodePoint(value: string, radix: number) {
  const point = Number.parseInt(value, radix);
  return Number.isInteger(point) && point >= 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
    ? String.fromCodePoint(point)
    : "";
}

export function safeNewsUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && url.toString().length <= 2_048
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export function decodeFeedText(value: string) {
  return value
    .replaceAll("<![CDATA[", "")
    .replaceAll("]]>", "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => decodeCodePoint(code, 16))
    .replace(/&#(\d+);/g, (_, code: string) => decodeCodePoint(code, 10))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyHeadline(title: string, fallback?: FeedFallback) {
  const lower = title.toLowerCase();
  const direct = watchedAliases.find(({ values }) => values.some((value) => lower.includes(value)));
  if (direct) {
    return {
      actor: direct.actor,
      targets: [direct.id],
      priority: 1 as const,
      reason: "直接提及你的关注标的",
    };
  }

  const peer = peers.find(({ aliases }) => aliases.some((alias) => lower.includes(alias)));
  if (peer) {
    return {
      actor: peer.actor,
      targets: [...peer.targets],
      priority: 4 as const,
      reason: "海外同类公司与映射市场",
    };
  }

  const topic = topicRules.find(({ pattern }) => pattern.test(title));
  if (topic) {
    return {
      actor: "产业链",
      targets: [...topic.targets],
      priority: 2 as const,
      reason: "同板块或产业链信号",
    };
  }

  if (indexPattern.test(title)) {
    return {
      actor: "指数",
      targets: watchlist.map(({ id }) => id),
      priority: 3 as const,
      reason: "关注标的所属市场指数信号",
    };
  }

  return fallback;
}

function hash(value: string) {
  let result = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16_777_619);
  }
  return (result >>> 0).toString(36);
}

function tag(item: string, name: string) {
  return item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "";
}

export function parseNewsFeed(xml: string, meta: FeedMeta): RawSignal[] {
  if (!xml || xml.length > 2_000_000) return [];
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)]
    .slice(0, Math.min(meta.maxItems ?? 30, 50))
    .flatMap((match) => {
      const item = match[1];
      const publisher = decodeFeedText(tag(item, "source"));
      let title = decodeFeedText(tag(item, "title"));
      const suffix = publisher ? ` - ${publisher}` : "";
      if (suffix && title.endsWith(suffix)) title = title.slice(0, -suffix.length).trim();
      const url = safeNewsUrl(decodeFeedText(tag(item, "link") || tag(item, "guid")));
      const published = new Date(decodeFeedText(tag(item, "pubDate") || tag(item, "published") || tag(item, "updated")));
      const classification = meta.preferFallback && meta.fallback
        ? meta.fallback
        : classifyHeadline(title, meta.fallback);
      if (!title || !url || Number.isNaN(published.getTime()) || !classification) return [];
      return [{
        id: `${meta.source}-${hash(`${url}-${title}`)}`,
        title,
        url,
        source: publisher ? `${meta.source} · ${publisher}` : meta.source,
        publishedAt: published.toISOString(),
        official: meta.official ?? false,
        ...classification,
      }];
    });
}

export function keepRecentSignals(signals: RawSignal[], days: number, now = Date.now()) {
  const oldest = now - days * 86_400_000;
  const newest = now + 6 * 3_600_000;
  return signals.filter(({ publishedAt }) => {
    const time = new Date(publishedAt).getTime();
    return Number.isFinite(time) && time >= oldest && time <= newest;
  });
}
