import { readFile, writeFile } from "node:fs/promises";
import { download, sha256 } from "./source-files.mjs";

const revision = process.argv[2];
if (!revision) throw new Error("Usage: npm run upstream:update -- <llvm-tag-or-commit>");
const response = await fetch(
  "https://api.github.com/repos/llvm/llvm-project/commits/" + encodeURIComponent(revision));
if (!response.ok) throw new Error("Cannot resolve revision: " + response.status);
const pin = JSON.parse(await readFile("upstream.json"));
pin.llvmVersion = revision;
pin.llvmCommit = (await response.json()).sha;
if (!/^[a-f0-9]{40}$/.test(pin.llvmCommit)) throw new Error("Invalid commit response");
for (const path of Object.keys(pin.files)) {
  pin.files[path] = sha256(await download(
    "https://raw.githubusercontent.com/llvm/llvm-project/" + pin.llvmCommit + "/" + path));
}
await writeFile("upstream.json", JSON.stringify(pin, null, 2) + "\n");
console.warn("Pins updated. Review upstream changes and run every verification gate.");
