import { providerNames } from "../../contracts.mjs";
import { createOpenAiCompatibleProvider } from "../openai-compatible/index.mjs";

export function createDeepSeekProvider(options = {}) {
  return createOpenAiCompatibleProvider({
    name: providerNames.DEEPSEEK,
    baseUrl: options.baseUrl || "https://api.deepseek.com",
    apiKey: options.apiKey || "",
    model: options.model || "deepseek-chat",
    fetchImpl: options.fetchImpl
  });
}
