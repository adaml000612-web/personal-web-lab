export type MainModule = "radar" | "prices";
export type CustomModelProvider = "deepseek" | "openai";

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
  customModel: string;
};

export const SETTINGS_STORAGE_KEY = "msd-settings-v1";
export const SESSION_API_KEY = "msd-model-api-key";

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
const modelName = /^[a-zA-Z0-9._:-]{1,80}$/;

function text(value: unknown, fallback: string, maximum = 80) {
  return typeof value === "string" && value.length <= maximum ? value : fallback;
}

export function isSafeModelName(value: string) {
  return modelName.test(value);
}

export function sanitizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return defaultSettings;
  const settings = value as Partial<AppSettings>;
  const mainModules = Array.isArray(settings.mainModules)
    ? [...new Set(settings.mainModules.filter((module): module is MainModule => module === "radar" || module === "prices"))]
    : defaultSettings.mainModules;
  const customProvider = settings.customProvider === "openai" ? "openai" : "deepseek";
  const fallbackModel = customProvider === "openai" ? "gpt-5.6-luna" : "deepseek-v4-flash";
  const selectedModel = text(settings.customModel, fallbackModel);

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
    customProvider,
    customModel: isSafeModelName(selectedModel) ? selectedModel : fallbackModel,
  };
}
