import { readFile } from "node:fs/promises";
import { loadDemangler } from "./load.js";

export async function createDemangler({ wasmBinary, wasmURL } = {}) {
  return loadDemangler(wasmBinary ?? await readFile(
    wasmURL ?? new URL("./llvm-rust-demangle.wasm", import.meta.url)));
}
