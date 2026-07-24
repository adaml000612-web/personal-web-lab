const chinaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const chinaTime = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function isEnglishHeadline(value: string) {
  const latin = value.match(/[A-Za-z]/g)?.length ?? 0;
  const chinese = value.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  return latin >= 6 && latin > chinese * 2;
}

export function normalizeTranslationText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidTranslationText(value: unknown) {
  if (typeof value !== "string") return false;
  const text = normalizeTranslationText(value);
  return text.length >= 3 &&
    text.length <= 400 &&
    new TextEncoder().encode(text).length <= 500 &&
    isEnglishHeadline(text);
}

export function signalTime(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  if (chinaDay.format(date) === chinaDay.format(now)) return `今天 ${chinaTime.format(date)}`;

  const minutes = Math.max(1, Math.floor((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}
