import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createDemangler } from "../dist/node.js";
import "./corpus.mjs";

const input = await readFile(".build/fuzz.txt", "utf8");
const names = input.trimEnd().split("\n");
const expected = execFileSync(".build/oracle", { input, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
  .trimEnd().split("\n");
assert.equal(expected.length, names.length);
const api = await createDemangler();
for (const [index, name] of names.entries()) {
  const result = api.demangle(name);
  assert.equal(result.text ?? "<invalid>", expected[index], name);
  assert.equal(result.status, expected[index] === "<invalid>" ? "invalid" : "success", name);
}
console.warn("Matched unpatched native LLVM on " + names.length + " names.");
