import assert from "node:assert/strict";
import { test } from "node:test";
import { createDemangler } from "../dist/node.js";

const api = await createDemangler();
// llvm/unittests/Demangle/RustDemangleTest.cpp at the pinned revision.
test("demangles the upstream example exactly", () => {
  assert.equal(api.demangleWithText("_RNvC1a4main").text, "a::main");
});

for (const input of ["?", "_R", "_D", "_D88", "_RRR", "_ZN3foo3barE", "_R18446744073709551617"]) {
  test("rejects malformed or unsupported name " + input, () => {
    const result = api.demangleWithText(input);
    assert.equal(result.status, "invalid");
    assert.equal(result.text, null);
    assert(result.warnings.length > 0);
    assert.equal(api.demangleWithText("_RNvC1a4main").text, "a::main");
  });
}

test("accepts UTF-8 identifiers and names over 1 MiB without wrapper caps", () => {
  // llvm/test/Demangle/rust.test: punycode identifiers and suffixes.
  assert.equal(api.demangleWithText("_RNvC8punycodeu7_1lqs71d").text, "punycode::東京");
  assert.equal(api.demangleWithText("_RC1a.π").text, "a (.π)");
  const long = "L".repeat(1048577);
  assert.equal(api.demangleWithText(`_RC${long.length}${long}`).text, long);
});

test("every truncated prefix returns a diagnostic or a valid upstream name", () => {
  const input = "_RNvC1a4main";
  for (let length = 0; length < input.length; ++length) {
    const result = api.demangleWithText(input.slice(0, length));
    assert.equal(result.status, "invalid");
    assert.equal(result.text, null);
  }
});

test("preserves the upstream recursion limit and recovers", () => {
  assert.equal(api.demangleWithText("_R" + "Nv".repeat(500) + "C1a" + "1b".repeat(500)).status,
    "invalid");
  assert.equal(api.demangleWithText("_RC1a").text, "a");
});
