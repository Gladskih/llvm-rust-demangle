import assert from "node:assert/strict";
import { test } from "node:test";
import { createDemangler } from "../dist/node.js";

const api = await createDemangler();

test("analysis exposes a source-backed tree without text; formatting parses the same tree", () => {
  const analysis = api.demangle("_RNvC1a4main");
  const formatted = api.demangleWithText("_RNvC1a4main");
  assert.equal(analysis.status, "success");
  assert(!Object.hasOwn(analysis, "text"));
  assert.equal(formatted.text, "a::main");
  assert.deepEqual(formatted.ast, analysis.ast);
  assert.equal(analysis.ast.root, 0);
  assert.equal(analysis.ast.nodes[0].kind, "Symbol");
  assert.equal(analysis.ast.nodes[0].start, 0);
  assert.equal(analysis.ast.nodes[0].end, "_RNvC1a4main".length);
});

test("failures expose no partial tree and formatted failures expose null text", () => {
  assert.deepEqual(api.demangle(null), { status: "invalid", ast: null, warnings: ["Expected a string."] });
  assert.equal(api.demangleWithText("?").ast, null);
  assert.equal(api.demangleWithText("?").text, null);
  assert.equal(api.demangleWithText(null).text, null);
});

// Independent grammar expansion: Rust RFC 2603 <path> and <identifier>.
test("captures exact rule hierarchy, names and byte ranges", () => {
  assert.deepEqual(api.demangle("_RNvC1a4main").ast, { root: 0, nodes: [
    {kind: "Symbol", start: 0, end: 12, children: [1]},
    {kind: "NestedPath", start: 2, end: 12, children: [2, 6, 7], namespace: "v"},
    {kind: "CrateRootPath", start: 4, end: 7, children: [3, 4]},
    {kind: "Disambiguator", start: 5, end: 5, children: [], value: "0"},
    {kind: "Identifier", start: 5, end: 7, children: [5], value: "a", encoding: "ascii"},
    {kind: "DecimalNumber", start: 5, end: 6, children: [], value: "1"},
    {kind: "Disambiguator", start: 7, end: 7, children: [], value: "0"},
    {kind: "Identifier", start: 7, end: 12, children: [8], value: "main", encoding: "ascii"},
    {kind: "DecimalNumber", start: 7, end: 8, children: [], value: "4"},
  ] });
});

test("preserves 128-bit constants without coercing them to JavaScript numbers", () => {
  // LLVM accepts a hex const-data sequence wider than uint64_t; keep every digit.
  const result = api.demangle("_RIC3fooKhffffffffffffffffffffffffffffffff_E");
  assert.equal(result.ast.nodes.find(node => node.kind === "Constant").type, "U8");
  assert.equal(result.ast.nodes.find(node => node.kind === "HexNumber").value,
    "ffffffffffffffffffffffffffffffff");
});

test("records original backreference offsets and the grammar LLVM visits there", () => {
  // RFC 2603 offsets exclude _R: B4_ decodes to offset 5, absolute byte 7.
  const result = api.demangle("_RINvC1a1fhB4_E");
  const reference = result.ast.nodes.find(node => node.kind === "BackrefType");
  assert.equal(reference.targetOffset, "7");
  assert.equal(result.ast.nodes[reference.children[1]].type, "I8");
  assert.equal(result.ast.nodes[reference.children[1]].start, 7);
});

test("captures punycode as LLVM identifier data independently of presentation", () => {
  const result = api.demangle("_RNvC8punycodeu7_1lqs71d");
  assert.deepEqual(result.ast.nodes.find(node => node.kind === "Identifier" && node.encoding === "punycode"),
    { kind: "Identifier", start: 14, end: 24, children: [8], value: "1lqs71d", encoding: "punycode" });
});

function crateWithDisambiguator(value) {
  // RustDemangle.cpp: parseOptionalBase62Number adds one after the base-62 offset.
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let digits = "";
  let remaining = value - 2n;
  do {
    digits = alphabet[Number(remaining % 62n)] + digits;
    remaining /= 62n;
  } while (remaining > 0n);
  return "_RCs" + digits + "_1a";
}

test("preserves uint64 disambiguators and rejects their overflow", () => {
  const result = api.demangle(crateWithDisambiguator(18446744073709551615n));
  assert.equal(result.status, "success");
  assert.equal(result.ast.nodes.find(node => node.kind === "Disambiguator").value,
    "18446744073709551615");
  assert.equal(api.demangle(crateWithDisambiguator(18446744073709551616n)).ast, null);
});

test("association bindings include their p marker and preserve their children", () => {
  // llvm/test/Demangle/rust.test: dyn IntoIterator<Item = _>.
  const input = "_RIC5traitDC12IntoIteratorp4ItempEL_E";
  const result = api.demangle(input);
  const binding = result.ast.nodes.find(node => node.kind === "AssociatedBinding");
  assert.equal(binding.start, input.indexOf("p4Item"));
  assert.equal(binding.end, input.indexOf("EL_E"));
  assert.deepEqual(binding.children.map(index => result.ast.nodes[index].kind),
    ["Identifier", "BasicType"]);
});

test("returns trees detached from later calls and from WASM memory", () => {
  const first = api.demangle("_RNvC1a4main");
  const expected = structuredClone(first.ast);
  first.ast.nodes[0].kind = "local change";
  first.ast.nodes[0].children.push(9999);
  assert.deepEqual(api.demangle("_RNvC1a4main").ast, expected);
  assert.deepEqual(api.demangleWithText("_RNvC1a4main").ast, expected);
});
