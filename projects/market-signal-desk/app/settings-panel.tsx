"use client";

import { useEffect, useRef, useState } from "react";
import {
  SESSION_API_KEY,
  colorPresets,
  defaultSettings,
  isSafeModelName,
  type AppSettings,
  type CustomModelProvider,
  type MainModule,
} from "./settings";

const moduleDetails: Record<MainModule, { name: string; description: string }> = {
  radar: { name: "情报雷达", description: "首页雷达、优先级和完整消息流" },
  prices: { name: "行情入门", description: "关注股票、K 线和新手分析" },
};

function Switch({
  checked,
  label,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`settings-switch ${checked ? "is-on" : ""}`}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const [apiKey, setApiKey] = useState("");
  const [hasSessionKey, setHasSessionKey] = useState(false);
  const [keyNotice, setKeyNotice] = useState("");

  useEffect(() => {
    setHasSessionKey(Boolean(sessionStorage.getItem(SESSION_API_KEY)));
    panelRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function patch(next: Partial<AppSettings>) {
    onChange({ ...settings, ...next });
  }

  function toggleMainModule(module: MainModule) {
    const enabled = settings.mainModules.includes(module);
    if (enabled && settings.mainModules.length === 1) return;
    patch({
      mainModules: enabled
        ? settings.mainModules.filter((item) => item !== module)
        : [...settings.mainModules, module],
    });
  }

  function moveModule(module: MainModule, direction: -1 | 1) {
    const index = settings.mainModules.indexOf(module);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= settings.mainModules.length) return;
    const next = [...settings.mainModules];
    [next[index], next[destination]] = [next[destination], next[index]];
    patch({ mainModules: next });
  }

  function changeProvider(provider: CustomModelProvider) {
    patch({
      customProvider: provider,
      customModel: provider === "deepseek" ? "deepseek-v4-flash" : "gpt-5.6-luna",
    });
  }

  function saveSessionKey() {
    const value = apiKey.trim();
    if (value.length < 20 || value.length > 256) {
      setKeyNotice("密钥长度不正确，请检查后再保存。");
      return;
    }
    sessionStorage.setItem(SESSION_API_KEY, value);
    setApiKey("");
    setHasSessionKey(true);
    setKeyNotice("密钥已保存到本次标签页会话。");
  }

  function clearSessionKey() {
    sessionStorage.removeItem(SESSION_API_KEY);
    setApiKey("");
    setHasSessionKey(false);
    setKeyNotice("本次会话密钥已清除。");
  }

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside className="settings-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="settings-title" tabIndex={-1}>
        <header className="settings-header">
          <div className="settings-spectrum" aria-hidden="true"><i /><i /></div>
          <div>
            <small>PERSONAL CONTROL ROOM</small>
            <h2 id="settings-title">把前哨调成你的样子</h2>
            <p>所有外观与板块设置只保存在当前设备。</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭设置">×</button>
        </header>

        <div className="settings-scroll">
          <section className="settings-section">
            <div className="settings-section-title"><span>外观</span><strong>颜色与阅读尺寸</strong></div>
            <div className="settings-preview" style={{
              "--preview-primary": settings.primaryColor,
              "--preview-secondary": settings.secondaryColor,
            } as React.CSSProperties}>
              <span>实时预览</span><strong>市场信号 120</strong><i>▲ 2.48%</i>
            </div>
            <div className="settings-presets">
              {colorPresets.map((preset) => (
                <button
                  type="button"
                  className={settings.primaryColor === preset.primary && settings.secondaryColor === preset.secondary ? "is-active" : ""}
                  key={preset.name}
                  onClick={() => patch({ primaryColor: preset.primary, secondaryColor: preset.secondary })}
                >
                  <i style={{ background: preset.primary }} /><i style={{ background: preset.secondary }} /><span>{preset.name}</span>
                </button>
              ))}
            </div>
            <div className="settings-color-grid">
              <label><span>主色调</span><input type="color" value={settings.primaryColor} onChange={(event) => patch({ primaryColor: event.target.value })} /><b>{settings.primaryColor}</b></label>
              <label><span>副色调</span><input type="color" value={settings.secondaryColor} onChange={(event) => patch({ secondaryColor: event.target.value })} /><b>{settings.secondaryColor}</b></label>
            </div>
            <label className="settings-range">
              <span><strong>全站最小字号</strong><b>{settings.fontSize}px</b></span>
              <input type="range" min="14" max="22" step="1" value={settings.fontSize} onChange={(event) => patch({ fontSize: Number(event.target.value) })} />
              <small>14px 紧凑 · 18px 舒适 · 22px 大字</small>
            </label>
          </section>

          <section className="settings-section">
            <div className="settings-section-title"><span>板块</span><strong>决定首页出现什么</strong></div>
            <div className="settings-module-list">
              {(["radar", "prices"] as const).map((module) => {
                const enabled = settings.mainModules.includes(module);
                const index = settings.mainModules.indexOf(module);
                return (
                  <div className={`settings-module ${enabled ? "is-enabled" : ""}`} key={module}>
                    <span className="settings-module-order">{enabled ? String(index + 1).padStart(2, "0") : "—"}</span>
                    <span><strong>{moduleDetails[module].name}</strong><small>{moduleDetails[module].description}</small></span>
                    <div className="settings-module-actions">
                      <button type="button" disabled={!enabled || index === 0} onClick={() => moveModule(module, -1)} aria-label={`上移${moduleDetails[module].name}`}>↑</button>
                      <button type="button" disabled={!enabled || index === settings.mainModules.length - 1} onClick={() => moveModule(module, 1)} aria-label={`下移${moduleDetails[module].name}`}>↓</button>
                      <Switch checked={enabled} disabled={enabled && settings.mainModules.length === 1} label={`显示${moduleDetails[module].name}`} onChange={() => toggleMainModule(module)} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="settings-minor-modules">
              <label><span><strong>指数滚动条</strong><small>顶部实时指数脉冲</small></span><Switch checked={settings.showPulse} label="显示指数滚动条" onChange={(showPulse) => patch({ showPulse })} /></label>
              <label><span><strong>关注股票滚动</strong><small>雷达底部的关注列表</small></span><Switch checked={settings.showStockRail} label="显示关注股票滚动" onChange={(showStockRail) => patch({ showStockRail })} /></label>
              <label><span><strong>问前哨智能体</strong><small>右下角的市场陪练</small></span><Switch checked={settings.showAgent} label="显示问前哨智能体" onChange={(showAgent) => patch({ showAgent })} /></label>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-title"><span>模型</span><strong>选择网站默认或自备模型</strong></div>
            <div className="settings-model-choice">
              <button type="button" className={settings.modelMode === "default" ? "is-active" : ""} onClick={() => patch({ modelMode: "default" })}>
                <span>推荐</span><strong>网站默认智能体</strong><small>无需密钥，模型不可用时自动退回真实数据分析。</small>
              </button>
              <button type="button" className={settings.modelMode === "custom" ? "is-active" : ""} onClick={() => patch({ modelMode: "custom" })}>
                <span>BYOK</span><strong>使用自己的模型</strong><small>自备 API Key，自行承担供应商费用。</small>
              </button>
            </div>
            {settings.modelMode === "custom" && (
              <div className="settings-custom-model">
                <label><span>服务商</span><select value={settings.customProvider} onChange={(event) => changeProvider(event.target.value as CustomModelProvider)}>
                  <option value="deepseek">DeepSeek 官方 API</option>
                  <option value="openai">OpenAI 官方 API</option>
                </select></label>
                <label><span>模型名称</span><input value={settings.customModel} maxLength={80} onChange={(event) => {
                  const value = event.target.value.trim();
                  if (!value || isSafeModelName(value)) patch({ customModel: value });
                }} placeholder={settings.customProvider === "deepseek" ? "deepseek-v4-flash" : "gpt-5.6-luna"} /></label>
                <label><span>API Key</span><input type="password" value={apiKey} maxLength={256} autoComplete="off" spellCheck={false} onChange={(event) => setApiKey(event.target.value)} placeholder={hasSessionKey ? "本次会话已有密钥，输入可替换" : "仅保存到当前标签页会话"} /></label>
                <div className="settings-key-actions">
                  <button type="button" onClick={saveSessionKey} disabled={!apiKey.trim()}>保存本次会话密钥</button>
                  {hasSessionKey && <button type="button" onClick={clearSessionKey}>清除密钥</button>}
                </div>
                {keyNotice && <p className="settings-key-notice" aria-live="polite">{keyNotice}</p>}
                <p className="settings-security-note"><strong>密钥不会写入长期设置或 GitHub。</strong>关闭这个浏览器标签页后自动失效，只会经本站服务器转发到你选择的官方接口。公共设备不要使用。</p>
              </div>
            )}
          </section>
        </div>

        <footer className="settings-footer">
          <button type="button" onClick={() => onChange(defaultSettings)}>恢复默认</button>
          <span>修改已自动保存</span>
          <button type="button" onClick={onClose}>完成</button>
        </footer>
      </aside>
    </div>
  );
}
