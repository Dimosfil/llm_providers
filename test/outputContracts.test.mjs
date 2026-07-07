import assert from "node:assert/strict";
import test from "node:test";
import { extractJsonBlock, parseJsonOutput, stripJsonBlock } from "../src/outputContracts.mjs";

test("extracts and parses marked JSON blocks", () => {
  const output = "Readable text.\nRESULT_JSON\n```json\n{\"ok\":true}\n```";

  assert.equal(extractJsonBlock(output, "RESULT_JSON").trim(), "{\"ok\":true}");
  assert.deepEqual(parseJsonOutput(output, { blockMarker: "RESULT_JSON" }), { ok: true });
  assert.equal(stripJsonBlock(output, "RESULT_JSON"), "Readable text.");
});

test("runs caller validation after JSON parsing", () => {
  const parsed = parseJsonOutput("{\"count\":2}", {
    validate(value) {
      return { count: Number(value.count), doubled: Number(value.count) * 2 };
    }
  });

  assert.deepEqual(parsed, { count: 2, doubled: 4 });
});
