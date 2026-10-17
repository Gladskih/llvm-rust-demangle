import { readFile, writeFile, mkdir } from "node:fs/promises";

function nodeSchema(kind, fields, basicTypes) {
  const base = { start: { type: "integer", minimum: 0 }, end: { type: "integer", minimum: 0 },
    children: { type: "array", items: { type: "integer", minimum: 0 } } };
  return {
    type: "object", additionalProperties: false,
    required: ["kind", ...Object.keys(base), ...Object.keys(fields).filter(name => !name.endsWith("?"))],
    properties: { kind: { const: kind }, ...base, ...Object.fromEntries(Object.entries(fields)
      .map(([name, type]) => [name.replace(/\?$/, ""), type === "BasicTypeName"
        ? { enum: basicTypes } : { type: "string" }])) },
  };
}

function schemaDocument(definitions, basicTypes, llvmCommit) {
  return { $schema: "https://json-schema.org/draft/2020-12/schema", llvmCommit,
    type: "object", additionalProperties: false, required: ["root", "nodes"], properties: {
      root: { type: "integer", minimum: 0 }, nodes: { type: "array", items: {
        oneOf: Object.entries(definitions).map(([kind, fields]) => nodeSchema(kind, fields, basicTypes)),
      } },
    } };
}

function declarations(definitions, basicTypes) {
  return "export interface ParseNode {\n" +
    "  start: number;\n  end: number;\n  children: number[];\n}\n" +
    "export type BasicTypeName = " + (basicTypes.map(name => JSON.stringify(name)).join(" | ") || "never") +
    ";\nexport type AstNode =\n" + Object.entries(definitions).map(([kind, fields]) =>
      "  | (ParseNode & { kind: \"" + kind + "\"; " + Object.entries(fields)
        .map(([name, type]) => name + ": " + type).join("; ") + " })").join("\n") + ";\n";
}

export async function generateSchema(basicTypes = []) {
  const definitions = JSON.parse(await readFile("scripts/grammar-nodes.json"));
  await mkdir("artifacts", { recursive: true });
  await writeFile("artifacts/ast-schema.json", JSON.stringify(schemaDocument(definitions, basicTypes,
    JSON.parse(await readFile("upstream.json")).llvmCommit), null, 2) + "\n");
  await writeFile("artifacts/ast.d.ts", declarations(definitions, basicTypes));
}
