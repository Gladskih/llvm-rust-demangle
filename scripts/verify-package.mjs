import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { npmCommand } from "./npm-command.mjs";

const packageJson = JSON.parse(await readFile("package.json"));
const info = JSON.parse(await readFile("dist/build-info.json"));
assert.equal(packageJson.version, info.packageVersion, "Rebuild after changing the package version");
assert.deepEqual(info.upstream, JSON.parse(await readFile("upstream.json")), "Stale upstream build");
for (const [name, expected] of Object.entries(info.files)) {
  const bytes = await readFile(`dist/${name}`);
  assert.equal(bytes.length, expected.bytes, name);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), expected.sha256, name);
}
assert.deepEqual((await readdir("dist")).sort(), [...Object.keys(info.files), "build-info.json"].sort());
assert(WebAssembly.validate(await readFile("dist/llvm-rust-demangle.wasm")));
assert.equal(packageJson.dependencies, undefined, "Consumers must not need other packages");
for (const lifecycle of ["preinstall", "install", "postinstall", "prepare"]) {
  assert.equal(packageJson.scripts[lifecycle], undefined, `Forbidden install lifecycle: ${lifecycle}`);
}
const [command, ...prefix] = npmCommand();
const pack = JSON.parse(execFileSync(command, [...prefix, "pack", "--dry-run", "--ignore-scripts",
  "--json"], { encoding: "utf8" }))[0];
const names = pack.files.map(file => file.path);
const licenses = ["LLVM.txt", "compiler-rt.txt", "emscripten-AUTHORS.txt", "emscripten-LICENSE.txt",
  "libcxx.txt", "libcxxabi.txt", "libunwind.txt", "musl.txt"];
const expected = ["package.json", "README.md", "LICENSE", "THIRD_PARTY_NOTICES.md", "upstream.json",
  ...licenses.map(name => `licenses/${name}`),
  ...(await readdir("dist")).map(name => `dist/${name}`)];
assert.deepEqual(names.sort(), expected.sort(), "Unexpected npm tarball contents");

console.warn(`Verified ${names.length} package files; ${(pack.size / 1024).toFixed(1)} KiB compressed.`);
