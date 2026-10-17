# llvm-rust-demangle

LLVM Rust symbol demangling compiled to WebAssembly. Runs entirely locally in
Node.js 24+ and modern browsers, including module workers, with no runtime dependencies.

```js
import { createDemangler } from "llvm-rust-demangle";

const demangler = await createDemangler();
demangler.demangle("_RNvC1a4main");
// { status: "success", text: "a::main", warnings: [] }
```

Initialization is asynchronous; demangling is synchronous. Results are detached plain
objects. Invalid names return `{ status: "invalid", text: null, warnings: [...] }`.
Allocation failures return `limit`; fatal WASM failures return `error` and require
creating a fresh instance. Loading/compilation failures reject initialization.
No AST or type-only API: upstream Rust parses directly to text.

For bundlers, pass the emitted asset URL explicitly:

```js
import { createDemangler } from "llvm-rust-demangle";
import wasmURL from "llvm-rust-demangle/llvm-rust-demangle.wasm?url";
const demangler = await createDemangler({ wasmURL });
```

Pass `{ wasmBinary: Uint8Array }` to initialize fully offline without fetch.
`wasmBinary` takes precedence over `wasmURL`. Node defaults to the adjacent local
WASM file; browsers fetch that asset from your own application. CSP needs
`script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'`.

Only well-formed Unicode strings without control characters are accepted.
The wrapper has no input/output size policy caps. Actual WASM memory/stack limits
still apply. LLVM supports Rust v0 (`_R`), not legacy Rust (`_ZN`). Its upstream recursion
limit is 500; exceeding it returns `invalid`.

Sources, SHA-256 hashes and Emscripten version are pinned in `upstream.json`.
See [CONTRIBUTING.md](CONTRIBUTING.md) for build and verification commands.
`EMSDK_ROOT` may point to an installed SDK at the exact pinned commit/version.
Build on Linux/WSL. Windows and Linux can consume the resulting npm package.
`npm run upstream:update -- <llvm-tag-or-commit>` refreshes source pins; review
source changes, safety adaptations, corpora and all gates before accepting an update.

Build metadata is exported as `llvm-rust-demangle/build-info.json`.
Wrapper: MIT. LLVM and linked runtime notices: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Upstream implementation: [LLVM source](https://github.com/llvm/llvm-project/blob/0d261d1ca552c95a8f007e061c787ac7132fbcbc/llvm/lib/Demangle/RustDemangle.cpp).
