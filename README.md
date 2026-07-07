# LLM Providers

Reusable Node.js modules for calling LLM and local agent runtimes through one small provider contract.

The first version extracts a reusable provider boundary from a game-companion prototype and removes the domain-specific profile logic. It keeps:

- OpenAI-compatible HTTP chat providers, including DeepSeek.
- Local Codex app-server provider.
- Deterministic mock provider for tests and offline development.
- Environment/config normalization.
- Output contracts for extracting fenced JSON blocks and validating parsed output.

## Install

```powershell
npm install
```

The project currently has no runtime dependencies.

## Use

```js
import { generateWithActiveProvider, loadProviderConfig } from "llm-providers";

const config = loadProviderConfig(process.env, {
  provider: "mock",
  mockResponse: "RESULT_JSON\n```json\n{\"ok\":true}\n```"
});

const result = await generateWithActiveProvider(config, {
  prompt: "Return JSON.",
  output: {
    blockMarker: "RESULT_JSON",
    parseJson: true,
    validate: (value) => ({ ok: Boolean(value.ok) })
  }
});

console.log(result.parsed);
```

## Providers

- `mock`: returns a configured response without network calls.
- `deepseek`: OpenAI-compatible `/chat/completions` provider using `DEEPSEEK_API_KEY`.
- `openai-compatible`: generic provider for compatible chat-completions APIs.
- `codex`: local Codex app-server provider using the signed-in local Codex runtime.

## Environment

- `LLM_PROVIDER`: `mock`, `deepseek`, `openai-compatible`, or `codex`.
- `LLM_MODEL`: model override for generic providers.
- `LLM_BASE_URL`: base URL for `openai-compatible`.
- `LLM_API_KEY`: API key for `openai-compatible`.
- `DEEPSEEK_API_KEY`: API key for DeepSeek.
- `DEEPSEEK_BASE_URL`: defaults to `https://api.deepseek.com`.
- `DEEPSEEK_MODEL`: defaults to `deepseek-chat`.
- `CODEX_COMMAND`: optional Codex command path.
- `CODEX_MODEL`: Codex app-server model override.
- `CODEX_EFFORT`: `low`, `medium`, or `high`; defaults to `high`.
- `CODEX_REQUEST_TIMEOUT_SECONDS`: JSON-RPC request timeout; defaults to `30`.
- `CODEX_TURN_TIMEOUT_SECONDS`: turn completion timeout; defaults to `180`.
- `LLM_MOCK_RESPONSE`: deterministic mock output.

## Security

Provider secrets stay in environment or caller-owned runtime config. Do not write API keys to source files, browser bundles, logs, generated artifacts, project memory, or committed examples.

## Verify

```powershell
npm test
npm run smoke
```
