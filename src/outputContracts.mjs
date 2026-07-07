export function buildJsonBlockPattern(marker) {
  const safeMarker = escapeRegExp(assertNonEmptyString(marker, "block marker"));
  return new RegExp(`(?:^|\\n)${safeMarker}\\s*\`\`\`(?:json)?\\s*([\\s\\S]*?)\\s*\`\`\``, "i");
}

export function extractJsonBlock(output, marker) {
  const text = String(output ?? "");
  const match = text.match(buildJsonBlockPattern(marker));
  if (!match) {
    throw new Error(`Output did not contain ${marker}.`);
  }
  return match[1];
}

export function stripJsonBlock(output, marker) {
  return String(output ?? "").replace(buildJsonBlockPattern(marker), "").trim();
}

export function parseJsonOutput(output, contract = {}) {
  const source = contract.blockMarker ? extractJsonBlock(output, contract.blockMarker) : String(output ?? "");
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    const label = contract.blockMarker ? `${contract.blockMarker} block` : "provider output";
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }

  return typeof contract.validate === "function" ? contract.validate(parsed) : parsed;
}

export function applyOutputContract(output, contract = {}) {
  if (!contract || typeof contract !== "object") {
    return undefined;
  }
  if (contract.parseJson || contract.blockMarker || typeof contract.validate === "function") {
    return parseJsonOutput(output, contract);
  }
  return undefined;
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
