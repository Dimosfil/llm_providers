# Provider Architecture

## Goal

Build a reusable Node.js provider layer for LLM and local agent runtimes. The
first implementation is extracted from the reusable parts of
`D:\AI\civilization_bot\src\companion` and intentionally excludes
Civilization-specific profile, SQL, game-log, and dashboard behavior.

## First Release Scope

- Common provider request/result contract.
- DeepSeek provider through an OpenAI-compatible chat-completions adapter.
- Generic OpenAI-compatible provider for other compatible APIs.
- Local Codex app-server provider using the signed-in local Codex runtime.
- Mock provider for tests and offline development.
- Output contracts for fenced JSON block extraction, JSON parsing, and
  caller-owned validation.
- Environment/config normalization without storing secrets in source or project
  memory.

## Boundaries

- Provider modules own transport, runtime startup, and raw response extraction.
- Callers own domain prompts, schemas, validators, and business-specific output
  interpretation.
- API keys and tokens are accepted only through environment or caller-owned
  runtime config.
- No provider writes generated artifacts, product files, logs, or project
  memory.
- Codex app-server runs in an ephemeral thread with developer instructions that
  forbid file edits, file inspection, shell commands, and approval requests.

## Source Mapping

- `src/providers/openai-compatible/` generalizes the DeepSeek
  `/chat/completions` call shape from Civilization Bot.
- `src/providers/deepseek/` is a small preset over the generic compatible
  provider.
- `src/providers/codex-app-server/` generalizes the Codex app-server runner
  from Civilization Bot.
- `src/outputContracts.mjs` generalizes the Codex fenced JSON block parsing
  contract.
- `src/providerRegistry.mjs` generalizes active provider selection.

## Verification

- `npm test` covers output contracts, mock provider, and chat-completions body
  mapping.
- `npm run smoke` verifies the public API through the mock provider.
