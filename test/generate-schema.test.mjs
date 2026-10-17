import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const schema = JSON.parse(await readFile("dist/ast-schema.json"));
const declarations = await readFile("dist/index.d.ts", "utf8");

test("publishes the revision-scoped grammar schema and concrete TypeScript union", () => {
  assert.equal(schema.llvmCommit, "0d261d1ca552c95a8f007e061c787ac7132fbcbc");
  assert.deepEqual(schema.required, ["root", "nodes"]);
  const symbol = schema.properties.nodes.items.oneOf.find(item => item.properties.kind.const === "Symbol");
  assert.deepEqual(symbol.required, ["kind", "start", "end", "children"]);
  assert.equal(symbol.additionalProperties, false);
  assert.match(declarations, /kind: "Symbol"/);
  assert.match(declarations, /demangleWithText\(input: string\): Promise|demangleWithText\(input: string\): DemangleWithTextResult/);
});
