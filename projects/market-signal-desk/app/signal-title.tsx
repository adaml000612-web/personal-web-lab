"use client";

import { useState } from "react";
import type { Signal } from "./market-config";
import {
  isEnglishHeadline,
  isValidTranslationText,
  translationFromResponse,
  translationUrl,
} from "./signal-presentation";

const cacheKey = "msd-translations";

function cachedTranslation(title: string) {
  try {
    const cache = JSON.parse(localStorage.getItem(cacheKey) ?? "{}");
    return typeof cache[title] === "string" ? cache[title] : "";
  } catch {
    localStorage.removeItem(cacheKey);
    return "";
  }
}

function cacheTranslation(title: string, translation: string) {
  try {
    const cache = JSON.parse(localStorage.getItem(cacheKey) ?? "{}");
    const entries = Object.entries({ ...cache, [title]: translation }).slice(-100);
    localStorage.setItem(cacheKey, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    localStorage.removeItem(cacheKey);
  }
}

export function SignalTitle({ signal, onOpen }: { signal: Signal; onOpen: () => void }) {
  const [translation, setTranslation] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canTranslate = isEnglishHeadline(signal.title);

  async function toggleTranslation() {
    if (translation) {
      setShowTranslation((current) => !current);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const cached = cachedTranslation(signal.title);
      if (cached) {
        setTranslation(cached);
        setShowTranslation(true);
        return;
      }
      if (!isValidTranslationText(signal.title)) throw new Error();
      const response = await fetch(translationUrl(signal.title));
      const data = await response.json();
      const translated = translationFromResponse(data);
      if (!response.ok || !translated) throw new Error();
      cacheTranslation(signal.title, translated);
      setTranslation(translated);
      setShowTranslation(true);
    } catch {
      setError("翻译服务繁忙，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <a href={signal.url} target="_blank" rel="noreferrer" onClick={onOpen}>
        <h3 lang={showTranslation ? "zh-CN" : undefined}>{showTranslation ? translation : signal.title}</h3>
      </a>
      {canTranslate && (
        <div className="translation-actions">
          <button type="button" onClick={() => void toggleTranslation()} disabled={loading}>
            {loading ? "翻译中…" : showTranslation ? "查看英文原文" : "翻译成中文"}
          </button>
          {showTranslation && <span>机器翻译 · 请以原文为准</span>}
          {error && <span className="translation-error">{error}</span>}
        </div>
      )}
    </>
  );
}
