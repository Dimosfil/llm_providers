import { providerNames } from "./contracts.mjs";
import { createCodexAppServerProvider } from "./providers/codex-app-server/index.mjs";
import { createDeepSeekProvider } from "./providers/deepseek/index.mjs";
import { createMockProvider } from "./providers/mock/index.mjs";
import { createOpenAiCompatibleProvider } from "./providers/openai-compatible/index.mjs";

export function createProvider(config = {}) {
  switch (config.provider) {
    case providerNames.MOCK:
      return createMockProvider({
        output: config.mockResponse,
        model: config.model
      });
    case providerNames.CODEX:
      return createCodexAppServerProvider({
        ...config.codex,
        model: config.codex?.model || config.model
      });
    case providerNames.OPENAI_COMPATIBLE:
      return createOpenAiCompatibleProvider({
        ...config.openAiCompatible,
        model: config.openAiCompatible?.model || config.model
      });
    case providerNames.DEEPSEEK:
    default:
      return createDeepSeekProvider({
        ...config.deepSeek,
        model: config.deepSeek?.model || config.model
      });
  }
}

export function isProviderConfigured(config = {}) {
  return createProvider(config).isConfigured();
}

export async function generateWithActiveProvider(config = {}, request = {}, callbacks = {}) {
  const provider = createProvider(config);
  return provider.generate(request, callbacks);
}
