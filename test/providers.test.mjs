import assert from "node:assert/strict";
import test from "node:test";
import { loadProviderConfig } from "../src/config.mjs";
import { generateWithActiveProvider, isProviderConfigured } from "../src/providerRegistry.mjs";
import { buildChatCompletionsBody, createOpenAiCompatibleProvider } from "../src/providers/openai-compatible/index.mjs";

test("mock provider uses the shared output contract", async () => {
  const config = loadProviderConfig({}, {
    provider: "mock",
    mockResponse: "RESULT_JSON\n```json\n{\"ok\":true}\n```"
  });

  assert.equal(isProviderConfigured(config), true);
  const result = await generateWithActiveProvider(config, {
    output: { blockMarker: "RESULT_JSON", parseJson: true }
  });

  assert.equal(result.provider, "mock");
  assert.deepEqual(result.parsed, { ok: true });
});

test("chat-completions body maps generic requests to provider payload", () => {
  const body = buildChatCompletionsBody({
    prompt: "hello",
    temperature: 0.2,
    maxTokens: 20,
    output: { parseJson: true }
  }, "model-a");

  assert.deepEqual(body.messages, [{ role: "user", content: "hello" }]);
  assert.equal(body.model, "model-a");
  assert.equal(body.temperature, 0.2);
  assert.equal(body.max_tokens, 20);
  assert.deepEqual(body.response_format, { type: "json_object" });
});

test("openai-compatible provider sends chat request and parses response", async () => {
  let captured = null;
  const provider = createOpenAiCompatibleProvider({
    baseUrl: "https://example.test/",
    apiKey: "test-key",
    model: "model-a",
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: "{\"ok\":true}" } }] };
        }
      };
    }
  });

  const result = await provider.generate({
    prompt: "hello",
    output: { parseJson: true }
  });

  assert.equal(captured.url, "https://example.test/chat/completions");
  assert.equal(captured.options.headers.Authorization, "Bearer test-key");
  assert.deepEqual(JSON.parse(captured.options.body).response_format, { type: "json_object" });
  assert.deepEqual(result.parsed, { ok: true });
});
