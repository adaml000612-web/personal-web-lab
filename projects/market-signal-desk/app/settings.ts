export type MainModule = "radar" | "prices";
export type CustomModelProvider =
  | "deepseek"
  | "openai"
  | "anthropic"
  | "google"
  | "zai"
  | "xai"
  | "qwen"
  | "minimax"
  | "kimi";
export type CustomModelId =
  | "deepseek-v4-flash"
  | "deepseek-v4-pro"
  | "gpt-5.6-sol"
  | "gpt-5.6-terra"
  | "gpt-5.6-luna"
  | "claude-fable-5"
  | "claude-opus-5"
  | "claude-sonnet-5"
  | "claude-opus-4-8"
  | "gemini-3.6-flash"
  | "gemini-3.5-flash"
  | "gemini-3.5-flash-lite"
  | "glm-5.2"
  | "glm-5.1"
  | "grok-4.5"
  | "qwen3.7-max"
  | "qwen3.7-plus"
  | "MiniMax-M2.7"
  | "MiniMax-M2.5"
  | "kimi-k3"
  | "kimi-k2.7-code"
  | "kimi-k2.7-code-highspeed"
  | "kimi-k2.6";

export type CustomModelDefinition = {
  id: CustomModelId;
  provider: CustomModelProvider;
  providerName: string;
  name: string;
  strength: string;
  releasedAt: string;
  generationAge: 0 | 1;
  keyUrl: string;
};

export type AppSettings = {
  primaryColor: string;
  secondaryColor: string;
  fontSize: number;
  mainModules: MainModule[];
  showPulse: boolean;
  showStockRail: boolean;
  showAgent: boolean;
  modelMode: "default" | "custom";
  customProvider: CustomModelProvider;
  customModel: CustomModelId;
};

export const SETTINGS_STORAGE_KEY = "msd-settings-v1";
export const SESSION_MODEL_KEY_PREFIX = "msd-model-api-key";

export const providerOrder: readonly CustomModelProvider[] = [
  "openai", "anthropic", "google", "deepseek", "kimi", "zai", "xai", "qwen", "minimax",
];

export const modelCatalog: readonly CustomModelDefinition[] = [
  {
    id: "deepseek-v4-flash",
    provider: "deepseek",
    providerName: "DeepSeek",
    name: "DeepSeek V4 Flash",
    strength: "快问快答、新闻摘要",
    releasedAt: "2026-04-24",
    generationAge: 0,
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "deepseek-v4-pro",
    provider: "deepseek",
    providerName: "DeepSeek",
    name: "DeepSeek V4 Pro",
    strength: "深度推理、长篇分析",
    releasedAt: "2026-04-24",
    generationAge: 0,
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "gpt-5.6-sol",
    provider: "openai",
    providerName: "OpenAI",
    name: "GPT-5.6 Sol",
    strength: "金融研究、专业报告",
    releasedAt: "2026-07-09",
    generationAge: 0,
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "gpt-5.6-terra",
    provider: "openai",
    providerName: "OpenAI",
    name: "GPT-5.6 Terra",
    strength: "日常分析、办公任务",
    releasedAt: "2026-07-09",
    generationAge: 0,
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "gpt-5.6-luna",
    provider: "openai",
    providerName: "OpenAI",
    name: "GPT-5.6 Luna",
    strength: "快速摘要、低成本",
    releasedAt: "2026-07-09",
    generationAge: 0,
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "claude-fable-5", provider: "anthropic", providerName: "Anthropic", name: "Claude Fable 5",
    strength: "前沿研究、长程智能体", releasedAt: "2026-06-09", generationAge: 0,
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "claude-opus-5", provider: "anthropic", providerName: "Anthropic", name: "Claude Opus 5",
    strength: "复杂分析、编码", releasedAt: "2026-07-24", generationAge: 0,
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "claude-sonnet-5", provider: "anthropic", providerName: "Anthropic", name: "Claude Sonnet 5",
    strength: "通用任务、速度均衡", releasedAt: "2026-07-24", generationAge: 0,
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "claude-opus-4-8", provider: "anthropic", providerName: "Anthropic", name: "Claude Opus 4.8",
    strength: "长上下文、智能体编码", releasedAt: "2026-05-28", generationAge: 1,
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "gemini-3.6-flash", provider: "google", providerName: "Google", name: "Gemini 3.6 Flash",
    strength: "多模态、图表理解", releasedAt: "2026-07-21", generationAge: 0,
    keyUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "gemini-3.5-flash", provider: "google", providerName: "Google", name: "Gemini 3.5 Flash",
    strength: "高吞吐、多模态", releasedAt: "2026-05-19", generationAge: 1,
    keyUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "gemini-3.5-flash-lite", provider: "google", providerName: "Google", name: "Gemini 3.5 Flash-Lite",
    strength: "批量摘要、数据提取", releasedAt: "2026-07-21", generationAge: 1,
    keyUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "glm-5.2", provider: "zai", providerName: "Z.AI", name: "GLM-5.2",
    strength: "长程编码、工程任务", releasedAt: "2026-06-16", generationAge: 0,
    keyUrl: "https://z.ai/manage-apikey/apikey-list",
  },
  {
    id: "glm-5.1", provider: "zai", providerName: "Z.AI", name: "GLM-5.1",
    strength: "智能体、中文推理", releasedAt: "2026-04-16", generationAge: 1,
    keyUrl: "https://z.ai/manage-apikey/apikey-list",
  },
  {
    id: "grok-4.5", provider: "xai", providerName: "xAI", name: "Grok 4.5",
    strength: "编码、工具调用", releasedAt: "2026-07-08", generationAge: 0,
    keyUrl: "https://console.x.ai/",
  },
  {
    id: "qwen3.7-max", provider: "qwen", providerName: "通义千问", name: "Qwen3.7 Max",
    strength: "复杂推理、中文任务", releasedAt: "2026-05-20", generationAge: 0,
    keyUrl: "https://bailian.console.aliyun.com/",
  },
  {
    id: "qwen3.7-plus", provider: "qwen", providerName: "通义千问", name: "Qwen3.7 Plus",
    strength: "中文办公、通用问答", releasedAt: "2026-05-26", generationAge: 0,
    keyUrl: "https://bailian.console.aliyun.com/",
  },
  {
    id: "MiniMax-M2.7", provider: "minimax", providerName: "MiniMax", name: "MiniMax M2.7",
    strength: "编程、工具调用", releasedAt: "2026-03-18", generationAge: 0,
    keyUrl: "https://platform.minimaxi.com/user-center/basic-information/interface-key",
  },
  {
    id: "MiniMax-M2.5", provider: "minimax", providerName: "MiniMax", name: "MiniMax M2.5",
    strength: "复杂任务、生产力", releasedAt: "2026-02-12", generationAge: 1,
    keyUrl: "https://platform.minimaxi.com/user-center/basic-information/interface-key",
  },
  {
    id: "kimi-k3", provider: "kimi", providerName: "Kimi", name: "Kimi K3",
    strength: "深度推理、知识工作", releasedAt: "2026-07-16", generationAge: 0,
    keyUrl: "https://platform.kimi.com/console/api-keys",
  },
  {
    id: "kimi-k2.7-code", provider: "kimi", providerName: "Kimi", name: "Kimi K2.7 Code",
    strength: "长程编程、代码智能体", releasedAt: "2026-06-12", generationAge: 1,
    keyUrl: "https://platform.kimi.com/console/api-keys",
  },
  {
    id: "kimi-k2.7-code-highspeed", provider: "kimi", providerName: "Kimi", name: "Kimi K2.7 Code Highspeed",
    strength: "高速编程、代码智能体", releasedAt: "2026-06-12", generationAge: 1,
    keyUrl: "https://platform.kimi.com/console/api-keys",
  },
  {
    id: "kimi-k2.6", provider: "kimi", providerName: "Kimi", name: "Kimi K2.6",
    strength: "通用智能体、多模态", releasedAt: "2026-04-20", generationAge: 1,
    keyUrl: "https://platform.kimi.com/console/api-keys",
  },
] as const;

export const defaultSettings: AppSettings = {
  primaryColor: "#1a7d64",
  secondaryColor: "#e96184",
  fontSize: 14,
  mainModules: ["radar", "prices"],
  showPulse: true,
  showStockRail: true,
  showAgent: true,
  modelMode: "default",
  customProvider: "deepseek",
  customModel: "deepseek-v4-flash",
};

export const colorPresets = [
  { name: "前哨原色", primary: "#1a7d64", secondary: "#e96184" },
  { name: "深海电波", primary: "#3559d9", secondary: "#11a9bf" },
  { name: "夜航金标", primary: "#233b67", secondary: "#d99b2b" },
  { name: "紫外脉冲", primary: "#7646b8", secondary: "#eb6b45" },
] as const;

const hexColor = /^#[0-9a-f]{6}$/i;
export function getModelDefinition(model: unknown) {
  return modelCatalog.find(({ id }) => id === model);
}

export function modelRecencyLabel(model: CustomModelDefinition, now = new Date("2026-07-27T00:00:00+08:00")) {
  const age = now.getTime() - new Date(`${model.releasedAt}T00:00:00Z`).getTime();
  return age <= 93 * 86_400_000 ? "近三个月" : "近两代";
}

export function isSupportedModel(provider: unknown, model: unknown): model is CustomModelId {
  const definition = getModelDefinition(model);
  return Boolean(definition && definition.provider === provider);
}

export function sessionSecretStorageKey(provider: CustomModelProvider) {
  return `${SESSION_MODEL_KEY_PREFIX}:${provider}`;
}

export function sanitizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return defaultSettings;
  const settings = value as Partial<AppSettings>;
  const mainModules = Array.isArray(settings.mainModules)
    ? [...new Set(settings.mainModules.filter((module): module is MainModule => module === "radar" || module === "prices"))]
    : defaultSettings.mainModules;
  const requestedProvider = providerOrder.includes(settings.customProvider as CustomModelProvider)
    ? settings.customProvider as CustomModelProvider
    : "deepseek";
  const selectedDefinition = getModelDefinition(settings.customModel);
  const selectedModel = selectedDefinition && selectedDefinition.provider === requestedProvider
    ? selectedDefinition
    : modelCatalog.find(({ provider }) => provider === requestedProvider) ?? modelCatalog[0];

  return {
    primaryColor: typeof settings.primaryColor === "string" && hexColor.test(settings.primaryColor)
      ? settings.primaryColor
      : defaultSettings.primaryColor,
    secondaryColor: typeof settings.secondaryColor === "string" && hexColor.test(settings.secondaryColor)
      ? settings.secondaryColor
      : defaultSettings.secondaryColor,
    fontSize: typeof settings.fontSize === "number" && Number.isFinite(settings.fontSize)
      ? Math.min(22, Math.max(14, Math.round(settings.fontSize)))
      : defaultSettings.fontSize,
    mainModules: mainModules.length ? mainModules : defaultSettings.mainModules,
    showPulse: settings.showPulse !== false,
    showStockRail: settings.showStockRail !== false,
    showAgent: settings.showAgent !== false,
    modelMode: settings.modelMode === "custom" ? "custom" : "default",
    customProvider: selectedModel.provider,
    customModel: selectedModel.id,
  };
}
