import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { prepareOwnership } from "../scripts/prepare-parser.mjs";
import { instrumentRust } from "../scripts/instrument-rust.mjs";

const original = await readFile(".build/llvm/llvm/lib/Demangle/RustDemangle.cpp", "utf8");

test("instruments checked source without changing the immutable input", () => {
  const generated = instrumentRust(prepareOwnership(original), "", "");
  assert.match(generated, /Scope Capture/);
  assert.match(generated, /Trace.field\("value"/);
  assert.match(generated, /Trace.field\("targetOffset"/);
  assert.match(generated, /#include "parse-symbol\.inc"/);
  assert(!original.includes("Scope Capture"));
});

test("fails closed if parser signatures change", () => {
  assert.throws(() => instrumentRust("", "", ""));
  assert.throws(() => instrumentRust(prepareOwnership(original).replace("Identifier Demangler::parseIdentifier", "changed"), "", ""));
});
