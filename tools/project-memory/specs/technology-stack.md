# Technology Stack

Last reviewed: 2026-07-07

Canonical source: this file
Linked from: TODO

This is project documentation. Keep business rules, feature algorithms, workflow
contracts, state machines, and verification guarantees in project memory; keep
stack facts, commands, runtime assumptions, and operational notes here.

## Summary

- Primary stack: Node.js ESM package with no runtime dependencies.
- Runtime model: reusable library modules imported by agent, service, or CLI projects.
- Current confidence: initial implementation verified by package manifest and tests.

## Components

| Layer | Technology | Evidence | Notes |
| --- | --- | --- | --- |
| Language/runtime | Node.js >=20, ESM | `package.json` | Uses built-in `fetch`, `node:test`, and Node core modules. |
| Frontend | None | Repository file map | This package is a provider library, not a UI. |
| Backend/API | Library modules under `src/` | `src/index.mjs` | Exposes provider registry, config, contracts, and provider adapters. |
| Data/storage | None | Source files | Providers do not own persistence or generated artifacts. |
| Build/package | npm package metadata | `package.json` | No build step currently required. |
| Test/quality | Node test runner | `package.json`, `test/` | `npm test`; smoke via `npm run smoke`. |
| Deployment/runtime | Imported package | `README.md` | Runtime consumers supply env/config and secrets. |

## Commands

| Purpose | Command | Evidence |
| --- | --- | --- |
| Install | `npm install` | `README.md`, `package.json` |
| Run | Import from `src/index.mjs` or package export | `README.md` |
| Test | `npm test` | `package.json` |
| Build | Not required | `package.json` |

## External Services

| Service | Role | Evidence | Boundary |
| --- | --- | --- | --- |
| DeepSeek | OpenAI-compatible provider preset | `src/providers/deepseek/` | API key from `DEEPSEEK_API_KEY`; no secrets in source. |
| Codex app-server | Local signed-in Codex runtime provider | `src/providers/codex-app-server/` | Uses local command/runtime; no provider API key in package. |
| Generic OpenAI-compatible APIs | Chat-completions provider | `src/providers/openai-compatible/` | API key from caller environment/config. |

## Gaps

- Add integration tests for real providers behind explicit opt-in environment flags.
- Decide whether to publish as a private npm package or keep as source-imported modules.
