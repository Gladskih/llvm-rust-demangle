import assert from "node:assert/strict";

export function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length, 2, "Unrecognized upstream code: " + before);
  return source.replace(before, () => after);
}

function lexicalMask(source) {
  // Ignore C++ comments and quoted/raw strings when balancing function braces.
  return source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|R"(\w*)\([\s\S]*?\)\1"|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
    token => token.replace(/[^\n]/g, " "));
}

function functionRange(source, signature) {
  assert.equal(source.split(signature).length, 2, "Unrecognized function: " + signature);
  const mask = lexicalMask(source);
  const start = mask.indexOf("{", source.indexOf(signature) + signature.length);
  assert(start >= 0, "Missing function body");
  assert.equal(mask.slice(source.indexOf(signature) + signature.length, start).trim(), "",
    "Expected a function definition: " + signature);
  let depth = 1;
  for (let end = start + 1; end < mask.length; ++end) {
    if (mask[end] === "{") ++depth;
    if (mask[end] === "}") --depth;
    if (depth === 0) return [start, end];
  }
  throw new Error("Unterminated function: " + signature);
}

export function assertRuleTags(source, signature, expected) {
  transformFunction(source, signature, body => {
    const actual = [...body.matchAll(/case '([^']+)':/g)].map(match => match[1]);
    assert.deepEqual([...new Set(actual)].sort(), [...expected].sort(),
      "Upstream grammar tags changed: " + signature);
    return body;
  });
}

export function transformFunction(source, signature, transform) {
  const [start, end] = functionRange(source, signature);
  return source.slice(0, start + 1) + transform(source.slice(start + 1, end)) + source.slice(end);
}

export function removeFunction(source, signature) {
  const [, end] = functionRange(source, signature);
  return source.slice(0, source.indexOf(signature)) + source.slice(end + 1);
}
