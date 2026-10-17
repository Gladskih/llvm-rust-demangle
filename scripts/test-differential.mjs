import { assertAst } from "../test/ast-contract.mjs";
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
const schema = JSON.parse(await readFile("dist/ast-schema.json"));
const api = await createDemangler();
for (const [index, name] of names.entries()) {
  const result = api.demangleWithText(name);
  const analysis = api.demangle(name);
  assert.equal(analysis.status, result.status, name);
  assert.deepEqual(analysis.ast, result.ast, name);
  assert(!Object.hasOwn(analysis, "text"));
  if (analysis.status === "success") assertAst(analysis.ast, name, schema);
  assert.equal(result.text ?? "<invalid>", expected[index], name);
  assert.equal(result.status, expected[index] === "<invalid>" ? "invalid" : "success", name);
}
console.warn("Matched unpatched native LLVM on " + names.length + " names.");
