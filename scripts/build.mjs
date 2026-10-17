import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
await mkdir("dist", { recursive: true });
for (const name of await readdir("src")) await cp(`src/${name}`, `dist/${name}`);
for (const name of ["llvm-rust-demangle.js", "llvm-rust-demangle.wasm", "ast-schema.json"]) {
  await cp(`artifacts/${name}`, `dist/${name}`);
}
await writeFile("dist/index.d.ts", await readFile("artifacts/ast.d.ts", "utf8") +
  await readFile("src/index.d.ts", "utf8"));
const files = {};
for (const name of (await readdir("dist")).filter(name => name !== "build-info.json").sort()) {
  const bytes = await readFile(`dist/${name}`);
  files[name] = { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}
await writeFile("dist/build-info.json", `${JSON.stringify({
  packageVersion: JSON.parse(await readFile("package.json")).version,
  upstream: JSON.parse(await readFile("upstream.json")),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  files,
}, null, 2)}\n`);
