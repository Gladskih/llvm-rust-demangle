import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createDemangler } from "../dist/node.js";

test("loads the default packaged asset", async () => {
  assert.equal((await createDemangler()).demangle("_RNvC1a4main").status, "success");
});

test("loads explicit local files and bytes without fetch", async () => {
  const wasmURL = new URL("../dist/llvm-rust-demangle.wasm", import.meta.url);
  const wasmBinary = await readFile(wasmURL);
  assert.equal((await createDemangler({ wasmURL })).demangle("_RNvC1a4main").status, "success");
  assert.equal((await createDemangler({ wasmBinary })).demangle("_RNvC1a4main").status, "success");
  assert.equal((await createDemangler({ wasmBinary, wasmURL: "/does-not-exist.wasm" }))
    .demangle("_RNvC1a4main").status, "success");
});

test("initialization rejects missing files and invalid WASM", async () => {
  await assert.rejects(createDemangler({ wasmURL: new URL("./missing.wasm", import.meta.url) }),
    /ENOENT/);
  await assert.rejects(createDemangler({ wasmBinary: new Uint8Array([0]) }));
});
