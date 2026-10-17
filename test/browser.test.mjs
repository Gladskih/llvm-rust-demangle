import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createDemangler } from "../dist/browser.js";

const wasmBinary = await readFile(new URL("../dist/llvm-rust-demangle.wasm", import.meta.url));

test("browser loader defaults to the neighboring WASM URL", async context => {
  const requests = [];
  context.mock.method(globalThis, "fetch", async url => {
    requests.push(String(url));
    return new Response(wasmBinary);
  });
  assert.equal((await createDemangler()).demangle("_RNvC1a4main").status, "success");
  assert.equal(requests.length, 1);
  assert.match(requests[0], /dist\/llvm-rust-demangle.wasm$/);
});

test("browser loader respects explicit URLs", async context => {
  context.mock.method(globalThis, "fetch", async url => {
    assert.equal(url, "/demangle.wasm");
    return new Response(wasmBinary);
  });
  assert.equal((await createDemangler({ wasmURL: "/demangle.wasm" })).demangle("_RNvC1a4main").status,
    "success");
});

test("browser loader supports offline bytes without fetch", async context => {
  context.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected fetch"); });
  assert.equal((await createDemangler({ wasmBinary })).demangle("_RNvC1a4main").status, "success");
});

test("browser loader propagates HTTP, network and compilation failures", async context => {
  context.mock.method(globalThis, "fetch", async () => new Response(null, { status: 404 }));
  await assert.rejects(createDemangler(), /HTTP 404/);
  await assert.rejects(createDemangler({ wasmBinary: new Uint8Array([0]) }));
  context.mock.method(globalThis, "fetch", async () => { throw new Error("Offline"); });
  await assert.rejects(createDemangler(), /Offline/);
});
