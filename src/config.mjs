import { homedir } from "node:os";
import path from "node:path";
import { providerNames } from "./contracts.mjs";

export function loadProviderConfig(env = process.env, overrides = {}) {
  const provider = normalizeProvider(overrides.provider ?? env.LLM_PROVIDER);

  return {
    provider,
    model: stringValue(overrides.model ?? env.LLM_MODEL, defaultModel(provider, env)),
    mockResponse: stringValue(overrides.mockResponse ?? env.LLM_MOCK_RESPONSE, ""),
    openAiCompatible: {
      baseUrl: stringValue(overrides.baseUrl ?? env.LLM_BASE_URL, ""),
      apiKey: stringValue(overrides.apiKey ?? env.LLM_API_KEY, ""),
      model: stringValue(overrides.model ?? env.LLM_MODEL, "gpt-4.1-mini")
    },
    deepSeek: {
      baseUrl: stringValue(overrides.deepSeekBaseUrl ?? env.DEEPSEEK_BASE_URL, "https://api.deepseek.com"),
      apiKey: stringValue(overrides.deepSeekApiKey ?? env.DEEPSEEK_API_KEY, ""),
      model: stringValue(overrides.deepSeekModel ?? env.DEEPSEEK_MODEL ?? env.LLM_MODEL, "deepseek-chat")
    },
    codex: {
      command: stringValue(overrides.codexCommand ?? env.CODEX_COMMAND, ""),
      model: stringValue(overrides.codexModel ?? env.CODEX_MODEL ?? env.LAUNCH_DESK_MODEL, "gpt-5.5"),
      effort: normalizeEffort(overrides.codexEffort ?? env.CODEX_EFFORT),
      cwd: stringValue(overrides.cwd ?? env.CODEX_CWD, process.cwd()),
      requestTimeoutMs: secondsToMs(overrides.codexRequestTimeoutSeconds ?? env.CODEX_REQUEST_TIMEOUT_SECONDS, 30),
      turnTimeoutMs: secondsToMs(overrides.codexTurnTimeoutSeconds ?? env.CODEX_TURN_TIMEOUT_SECONDS, 180)
    }
  };
}

export function normalizeProvider(value) {
  const provider = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (provider === providerNames.CODEX) return providerNames.CODEX;
  if (provider === providerNames.DEEPSEEK) return providerNames.DEEPSEEK;
  if (provider === providerNames.OPENAI_COMPATIBLE || provider === "openai") return providerNames.OPENAI_COMPATIBLE;
  if (provider === providerNames.MOCK) return providerNames.MOCK;
  return providerNames.DEEPSEEK;
}

export function normalizeEffort(value) {
  const effort = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ["low", "medium", "high"].includes(effort) ? effort : "high";
}

export function resolvePreferredCodexCommand(env = process.env) {
  if (env.CODEX_COMMAND?.trim()) {
    return env.CODEX_COMMAND.trim();
  }

  if (process.platform === "win32") {
    return path.join(env.USERPROFILE || homedir(), ".codex", "bin", "codex.cmd");
  }

  return "codex";
}

function defaultModel(provider, env) {
  if (provider === providerNames.CODEX) return env.CODEX_MODEL || env.LAUNCH_DESK_MODEL || "gpt-5.5";
  if (provider === providerNames.DEEPSEEK) return env.DEEPSEEK_MODEL || "deepseek-chat";
  return env.LLM_MODEL || "gpt-4.1-mini";
}

function stringValue(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function secondsToMs(value, fallbackSeconds) {
  const number = Number(value);
  return (Number.isFinite(number) && number > 0 ? number : fallbackSeconds) * 1000;
}
