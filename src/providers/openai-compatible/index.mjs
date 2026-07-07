import { providerNames } from "../../contracts.mjs";
import { applyOutputContract } from "../../outputContracts.mjs";

export function createOpenAiCompatibleProvider(options = {}) {
  const name = options.name || providerNames.OPENAI_COMPATIBLE;
  const baseUrl = stripTrailingSlash(options.baseUrl || "");
  const apiKey = options.apiKey || "";
  const defaultModel = options.model || "gpt-4.1-mini";
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  return {
    name,
    model: defaultModel,
    isConfigured: () => Boolean(baseUrl && apiKey && fetchImpl),
    async generate(request = {}) {
      if (!baseUrl) {
        throw new Error(`${name} baseUrl is not configured.`);
      }
      if (!apiKey) {
        throw new Error(`${name} apiKey is not configured.`);
      }
      if (typeof fetchImpl !== "function") {
        throw new Error("fetch is not available in this runtime.");
      }

      const model = request.model || defaultModel;
      const body = buildChatCompletionsBody(request, model);
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${name} request failed: HTTP ${response.status} ${text.slice(0, 300)}`);
      }

      const raw = await response.json();
      const output = raw?.choices?.[0]?.message?.content;
      if (typeof output !== "string" || !output.trim()) {
        throw new Error(`${name} returned an empty response.`);
      }

      return {
        provider: name,
        model,
        output,
        parsed: applyOutputContract(output, request.output),
        raw
      };
    }
  };
}

export function buildChatCompletionsBody(request = {}, model) {
  const messages = Array.isArray(request.messages) && request.messages.length > 0
    ? request.messages
    : [{ role: "user", content: String(request.prompt ?? "") }];

  const body = {
    model,
    messages,
    temperature: numberOrUndefined(request.temperature),
    max_tokens: integerOrUndefined(request.maxTokens)
  };

  if (request.output?.parseJson && !request.output?.blockMarker) {
    body.response_format = { type: "json_object" };
  }

  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
}

function stripTrailingSlash(value) {
  return String(value ?? "").replace(/\/$/, "");
}

function numberOrUndefined(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function integerOrUndefined(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.round(number)) : undefined;
}
