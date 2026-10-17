import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { npmCommand } from "./npm-command.mjs";

const pack = JSON.parse(await readFile("pack-result.json"))[0];
const tarball = resolve(pack.filename);
const temporary = await mkdtemp(join(tmpdir(), "llvm-rust-demangle-"));
async function removeTemporary() {
  if (dirname(await realpath(temporary)) !== await realpath(tmpdir())) {
    throw new Error("Refusing to delete a directory outside the temporary root");
  }
  await rm(temporary, { recursive: true, force: true });
}
try {
  const [command, ...prefix] = npmCommand();
  execFileSync(command, [...prefix, "install", "--offline", "--ignore-scripts", "--no-audit",
    "--no-fund", tarball], { cwd: temporary, stdio: "pipe" });
  await writeFile(join(temporary, "smoke.mjs"), `
    import assert from "node:assert/strict";
    import { createDemangler } from "llvm-rust-demangle";
    import { readFile } from "node:fs/promises";
    const asset = import.meta.resolve("llvm-rust-demangle/llvm-rust-demangle.wasm");
    const schema = JSON.parse(await readFile(new URL(import.meta.resolve("llvm-rust-demangle/ast-schema.json"))));
    assert.equal(schema.properties.nodes.items.oneOf[0].properties.kind.const, "Symbol");
    const api = await createDemangler();
    assert.equal(api.demangleWithText("_RNvC1a4main").text, "a::main");
    assert.equal(api.demangle("_RNvC1a4main").ast.nodes[0].kind, "Symbol");
    assert.equal(api.demangleWithText("?").status, "invalid");
    assert.equal((await createDemangler({ wasmBinary: await readFile(new URL(asset)) }))
      .demangleWithText("_RNvC1a4main").text, "a::main");
  `);
  execFileSync(process.execPath, ["smoke.mjs"], { cwd: temporary, stdio: "pipe" });
  assert(pack.files.some(file => file.path === "dist/index.d.ts"));
  assert(pack.files.some(file => file.path === "licenses/LLVM.txt"));
} finally {
  await removeTemporary();
}
console.warn(`Installed and tested the exact tarball: ${pack.filename}`);
