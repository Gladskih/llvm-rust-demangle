import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { prepareUtility, prepareOwnership } from "../scripts/prepare-parser.mjs";

const utility = await readFile(".build/llvm/llvm/include/llvm/Demangle/Utility.h", "utf8");
const parser = await readFile(".build/llvm/llvm/lib/Demangle/RustDemangle.cpp", "utf8");

test("adds checked arithmetic and keeps allocation ownership on failure", () => {
  const patched = prepareUtility(utility);
  assert.match(patched, /checkedAdd\(N, CurrentPosition\)/);
  assert.match(patched, /if \(Replacement == nullptr\) throw std::bad_alloc/);
  assert(!patched.includes("std::abort()"));
  assert.match(prepareOwnership(parser), /return .*\.release\(\);/);
  assert(!prepareOwnership(parser).includes("std::free("));
});

test("rejects changed upstream allocation and ownership insertion points", () => {
  assert.throws(() => prepareUtility(utility.replace("size_t Need = N + CurrentPosition;", "")));
  assert.throws(() => prepareUtility(utility + utility));
  assert.throws(() => prepareOwnership(parser.replace("std::free(", "changed(")));
  assert.throws(() => prepareOwnership(parser.replace(/return .*\.getBuffer\(\);/, "")));
});
