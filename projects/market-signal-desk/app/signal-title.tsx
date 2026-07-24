"use client";

import { useState } from "react";
import type { Signal } from "./market-config";
import { isEnglishHeadline } from "./signal-presentation";

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
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: signal.title }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.translation !== "string") throw new Error();
      setTranslation(data.translation);
      setShowTranslation(true);
    } catch {
      setError("翻译暂时不可用");
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
