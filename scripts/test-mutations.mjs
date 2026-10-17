// Deliberate, focused mutations. Each must fail a semantic or boundary test.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const mutations = [
  ["dist/core.js", "run(input, module._demangle_with_text)", "run(input, module._demangle)"],
  ["dist/core.js", "run(input, module._demangle)", "run(input, module._demangle_with_text)"],
  ["dist/validation.js", "!input.isWellFormed()", "false"],
  ["dist/core.js", "entry(bytes.length)", "entry(input.length)"],
  ["dist/validation.js", "typeof input !== \"string\"", "false"],
  ["dist/validation.js", "input.length === 0", "false"],
  ["dist/validation.js", "input.charCodeAt(index) < 0x20", "false"],
  ["dist/validation.js", "input.charCodeAt(index) === 0x7f", "false"],
  ["dist/core.js", "!Number.isInteger(address)", "false"],
  ["dist/core.js", "address <= 0", "false"],
  ["dist/core.js", "!Number.isInteger(length)", "false"],
  ["dist/core.js", "length <= 0", "false"],
  ["dist/core.js", "address > heap.byteLength - length", "false"],
  ["dist/core.js", "module._input_buffer(bytes.length)", "module._input_buffer(0)"],
  ["dist/core.js", "pointer === 0", "false"],
  ["dist/core.js", "pointer + 2 ** 32", "pointer"],
  ["dist/core.js", "size + 2 ** 32", "size"],
  ["dist/core.js", "if (failed)", "if (false)"],
  ["dist/browser.js", "if (wasmBinary !== undefined)", "if (false)"],
  ["dist/browser.js", "if (!response.ok)", "if (false)"],
  ["dist/node.js", "wasmBinary ?? await", "undefined ?? await"],
];
function testsPass() {
  return spawnSync(process.execPath, ["--test", "test/core.test.mjs", "test/validation.test.mjs",
    "test/node.test.mjs", "test/browser.test.mjs", "test/demangle.test.mjs"], { timeout: 15000 }).status === 0;
}
assert(testsPass(), "Mutation baseline failed");
for (const [path, before, after] of mutations) {
  const original = await readFile(path, "utf8");
  assert.equal(original.split(before).length, 2, `Missing or ambiguous mutation target: ${before}`);
  try {
    await writeFile(path, original.replace(before, after));
    assert(!testsPass(), `Surviving mutation: ${path}: ${before}`);
  } finally {
    await writeFile(path, original);
  }
}
console.warn(`Killed ${mutations.length}/${mutations.length} focused mutations.`);
