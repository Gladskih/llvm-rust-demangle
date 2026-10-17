import assert from "node:assert/strict";

function assertField(value, field) {
  if (Object.hasOwn(field, "const")) assert.equal(value, field.const);
  else if (field.enum) assert(field.enum.includes(value));
  else if (field.type === "integer") assert(Number.isSafeInteger(value) && value >= 0);
  else if (field.type === "array") assert(Array.isArray(value));
  else assert.equal(typeof value, field.type);
}

export function assertAst(ast, input, schema) {
  assert.equal(ast.root, 0);
  assert(ast.nodes.length > 0);
  assert.equal(ast.nodes[0].kind, "Symbol");
  assert.equal(ast.nodes[0].start, 0);
  assert.equal(ast.nodes[0].end, new TextEncoder().encode(input).length);
  const edges = [];
  for (const [index, node] of ast.nodes.entries()) {
    const variant = schema.properties.nodes.items.oneOf.find(item => item.properties.kind.const === node.kind);
    assert(variant, "Unknown node kind: " + node.kind);
    for (const key of variant.required) assert(Object.hasOwn(node, key), node.kind + ": " + key);
    for (const [key, value] of Object.entries(node)) {
      assert(Object.hasOwn(variant.properties, key), "Unexpected node field: " + key);
      assertField(value, variant.properties[key]);
    }
    assert(node.start <= node.end && node.end <= ast.nodes[0].end);
    for (const child of node.children) {
      assert(Number.isSafeInteger(child) && child > index && child < ast.nodes.length);
      edges.push(child);
    }
  }
  assert.deepEqual(edges.sort((left, right) => left - right), ast.nodes.slice(1).map((_, index) => index + 1));
}
