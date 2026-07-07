import { providerNames } from "../../contracts.mjs";
import { applyOutputContract } from "../../outputContracts.mjs";

export function createMockProvider(options = {}) {
  const output = String(options.output ?? options.mockResponse ?? "");
  const model = String(options.model ?? "mock-model");

  return {
    name: providerNames.MOCK,
    model,
    isConfigured: () => true,
    async generate(request = {}) {
      const text = output || String(request.prompt ?? "");
      return {
        provider: providerNames.MOCK,
        model,
        output: text,
        parsed: applyOutputContract(text, request.output)
      };
    }
  };
}
