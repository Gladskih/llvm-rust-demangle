import { loadDemangler } from "./load.js";

export async function createDemangler({ wasmBinary, wasmURL } = {}) {
  if (wasmBinary !== undefined) return loadDemangler(wasmBinary);
  const response = await fetch(wasmURL ?? new URL("./llvm-rust-demangle.wasm", import.meta.url));
  if (!response.ok) throw new Error(`Could not load LLVM WASM: HTTP ${response.status}`);
  return loadDemangler(new Uint8Array(await response.arrayBuffer()));
}
