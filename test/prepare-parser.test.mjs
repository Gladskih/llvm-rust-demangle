import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { prepareUtility, prepareOwnership } from "../scripts/prepare-parser.mjs";

test("importing parser transforms does not read or write build artifacts", async context => {
  const root = await mkdtemp(join(tmpdir(), "demangle-parser-import-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const module = new URL("../scripts/prepare-parser.mjs", import.meta.url).href;
  execFileSync(process.execPath, ["--input-type=module", "-e",
    `await import(${JSON.stringify(module)});`], { cwd: root, stdio: "pipe" });
  assert.deepEqual(await readdir(root), []);
});

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
