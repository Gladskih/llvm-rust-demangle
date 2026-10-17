import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createDemangler } from "../dist/node.js";

// Pinned upstream examples plus RFC 2603 grammar cases. AST values are checked
// independently in test/structured.test.mjs before this native/WASM comparison.
const examples = ["_RNvC1a4main","_RNvCs_1a1b","_RINvC1a1fhB4_E","_RIC3fooKhffffffffffffffffffffffffffffffff_E"];
const mutations = [["Trace.field(\"namespace\", std::string(1, NS));","Trace.field(\"namespace\", \"incorrect\");",1],["Trace.field(\"value\", std::string(S));","Trace.field(\"value\", \"incorrect\");",1],["Trace.field(\"type\", astBasicType(Type));","Trace.field(\"type\", \"incorrect\");",2],["return Capture.number(N);","return Capture.number(N + 1);",1]];
const api = await createDemangler();
const expected = examples.map(name => api.demangle(name));
assert(expected.every(result => result.status === "success"));
const original = await readFile(".build/parser.cpp", "utf8");

function nativeResults() {
  execFileSync("clang++", ["-std=c++17", "-O0", "-I", ".build/guarded", "-I", ".build/llvm/llvm/include",
    "-I", "native", "native/bridge.cpp", "native/ast-oracle.cpp", ".build/mutated-parser.cpp",
    "-o", ".build/mutated-oracle"], { stdio: "pipe" });
  return execFileSync(".build/mutated-oracle", { input: examples.join("\n") + "\n", encoding: "utf8" })
    .trimEnd().split("\n").map(line => JSON.parse(line));
}

await writeFile(".build/mutated-parser.cpp", original);
assert.deepEqual(nativeResults(), expected, "Native/WASM AST baseline mismatch");
for (const [before, after, occurrences] of mutations) {
  assert.equal(original.split(before).length, occurrences + 1, "Missing mutation target: " + before);
  await writeFile(".build/mutated-parser.cpp", original.replaceAll(before, after));
  assert.notDeepEqual(nativeResults(), expected, "Surviving native semantic mutation: " + before);
}
console.warn("Killed " + mutations.length + "/" + mutations.length + " native semantic mutations.");
