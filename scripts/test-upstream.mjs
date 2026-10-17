import { assertAst } from "../test/ast-contract.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDemangler } from "../dist/node.js";
import "./corpus.mjs";

const schema = JSON.parse(await readFile("dist/ast-schema.json"));
const api = await createDemangler();
const cases = JSON.parse(await readFile(".build/cases.json"));
for (const [input, expected] of cases) {
  const result = api.demangleWithText(input);
  if (result.status === "success") assertAst(result.ast, input, schema);
  // FileCheck canonicalizes horizontal whitespace unless --strict-whitespace is used.
  assert.equal(result.text?.replace(/[ \t]+/g, " ") ?? null,
    expected?.replace(/[ \t]+/g, " ") ?? null, input);
  assert.equal(result.status, expected === null ? "invalid" : "success", input);
}
console.warn("Passed " + cases.length + " independent upstream expectations.");
