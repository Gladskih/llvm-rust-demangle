import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { assertAst } from "./ast-contract.mjs";
import { createDemangler } from "../dist/node.js";

const schema = JSON.parse(await readFile("dist/ast-schema.json"));
const api = await createDemangler();

test("checks the grammar schema, bounds, edges and mandatory values", () => {
  assertAst(api.demangle("_RNvC1a4main").ast, "_RNvC1a4main", schema);
  const damaged = api.demangle("_RNvC1a4main").ast;
  damaged.nodes[1].children.push(0);
  assert.throws(() => assertAst(damaged, "_RNvC1a4main", schema));
});

test("rejects missing semantic fields and unknown node kinds", () => {
  const damaged = api.demangle("_RNvC1a4main").ast;
  damaged.nodes[1].kind = "invented";
  assert.throws(() => assertAst(damaged, "_RNvC1a4main", schema));
  const missing = api.demangle("_RNvC1a4main").ast;
  delete missing.nodes.find(node => node.kind === "DecimalNumber").value;
  assert.throws(() => assertAst(missing, "_RNvC1a4main", schema));
});
