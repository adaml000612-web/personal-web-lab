export type MainModule = "radar" | "prices";
export type CustomModelProvider = "deepseek" | "openai";
export type CustomModelId =
  | "deepseek-v4-flash"
  | "deepseek-v4-pro"
  | "gpt-5.1"
  | "gpt-5-mini"
  | "gpt-5-nano";

export type CustomModelDefinition = {
  id: CustomModelId;
  provider: CustomModelProvider;
  providerName: string;
  name: string;
  badge: string;
  description: string;
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

export const modelCatalog: readonly CustomModelDefinition[] = [
  {
    id: "deepseek-v4-flash",
    provider: "deepseek",
    providerName: "DeepSeek",
    name: "DeepSeek V4 Flash",
    badge: "推荐 · 速度优先",
    description: "成本低、响应快，适合日常行情解读和新闻归纳。",
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "deepseek-v4-pro",
    provider: "deepseek",
    providerName: "DeepSeek",
    name: "DeepSeek V4 Pro",
    badge: "深度分析",
    description: "推理能力更强，适合复杂市场关系和长篇情报分析。",
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "gpt-5.1",
    provider: "openai",
    providerName: "OpenAI",
    name: "GPT-5.1",
    badge: "综合能力",
    description: "综合理解和推理能力更强，适合需要更完整解释的提问。",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "gpt-5-mini",
    provider: "openai",
    providerName: "OpenAI",
    name: "GPT-5 mini",
    badge: "速度与成本平衡",
    description: "响应更快、费用更低，适合高频日常问答。",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "gpt-5-nano",
    provider: "openai",
    providerName: "OpenAI",
    name: "GPT-5 nano",
    badge: "最低成本",
    description: "适合简短摘要和基础解释，复杂分析能力相对有限。",
    keyUrl: "https://platform.openai.com/api-keys",
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
  const requestedProvider = settings.customProvider === "openai" ? "openai" : "deepseek";
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
