import { readFile } from "node:fs/promises";
import { ensureSource } from "./source-files.mjs";

const pin = JSON.parse(await readFile(new URL("../upstream.json", import.meta.url)));
const root = new URL("../.build/llvm/", import.meta.url);
for (const [path, hash] of Object.entries(pin.files)) {
  await ensureSource(root, pin.llvmCommit, path, hash);
}
console.warn(`Verified ${Object.keys(pin.files).length} LLVM source files.`);
