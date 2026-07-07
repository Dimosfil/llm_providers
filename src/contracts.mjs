/**
 * @typedef {"mock"|"deepseek"|"openai-compatible"|"codex"} ProviderName
 */

/**
 * @typedef {Object} ChatMessage
 * @property {"system"|"user"|"assistant"|"tool"} role
 * @property {string} content
 */

/**
 * @typedef {Object} OutputContract
 * @property {string} [blockMarker] Marker that appears before a fenced JSON block.
 * @property {boolean} [parseJson] Parse the whole output or marked block as JSON.
 * @property {(value: unknown) => unknown} [validate] Optional caller-owned validator.
 */

/**
 * @typedef {Object} ProviderRequest
 * @property {string} [prompt] Plain prompt. Used when messages are not supplied.
 * @property {ChatMessage[]} [messages] Chat-completion messages.
 * @property {string} [model] Per-request model override.
 * @property {number} [temperature] Optional sampling temperature.
 * @property {number} [maxTokens] Optional output token cap.
 * @property {Record<string, unknown>} [metadata] Caller-owned metadata.
 * @property {OutputContract} [output] Output parsing and validation contract.
 */

/**
 * @typedef {Object} ProviderResult
 * @property {string} provider
 * @property {string} model
 * @property {string} output
 * @property {unknown} [parsed]
 * @property {unknown} [raw]
 */

/**
 * @typedef {Object} RunCallbacks
 * @property {(message: string) => void} [onStatus]
 * @property {(delta: string) => void} [onTextDelta]
 */

export const providerNames = Object.freeze({
  MOCK: "mock",
  DEEPSEEK: "deepseek",
  OPENAI_COMPATIBLE: "openai-compatible",
  CODEX: "codex"
});
