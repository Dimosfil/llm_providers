import { generateWithActiveProvider, loadProviderConfig } from "../src/index.mjs";

const config = loadProviderConfig({}, {
  provider: "mock",
  mockResponse: "SMOKE_JSON\n```json\n{\"status\":\"ok\"}\n```"
});

const result = await generateWithActiveProvider(config, {
  prompt: "Return a smoke status.",
  output: {
    blockMarker: "SMOKE_JSON",
    parseJson: true
  }
});

if (result.parsed?.status !== "ok") {
  throw new Error("Smoke check failed.");
}

console.log("smoke ok");
