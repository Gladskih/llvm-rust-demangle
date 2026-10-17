# llvm-rust-demangle

Local LLVM Rust demangling with a structured parse tree, compiled to WebAssembly.
Works in Node.js 24+, browsers and module workers without runtime dependencies.

```js
import { createDemangler } from "llvm-rust-demangle";

const api = await createDemangler();
const result = api.demangle("_RNvC1a4main");
// { status: "success", ast: { root: 0, nodes: [...] }, warnings: [] }

result.ast.nodes.filter(node => node.kind === "Identifier").map(node => node.value);
// ["a", "main"]

api.demangleWithText("_RNvC1a4main").text;
// "a::main"
```

Initialization is asynchronous; both methods are synchronous afterwards.
`demangle` captures parser structure and semantic values without constructing output
text. `demangleWithText` captures the identical tree and LLVM presentation in one
traversal. Input is parsed once per call; original LLVM backreference visits remain.

The upstream Rust/D parsers have no native AST. This package instruments their
actual grammar operations; its tree is a wrapper-defined, revision-scoped parse tree,
with generated TypeScript declarations and an exported `ast-schema.json`.
It is not a reconstruction from a demangled string.

An AST has `root` (an index) and flat `nodes`. Each node has a typed `kind`,
`children` in grammar order, and half-open `start`/`end` byte offsets into the
original UTF-8 mangled input. Ranges may overlap when LLVM revisits a backreference.
An omitted optional production can have an empty range. Backreference target offsets
are absolute byte offsets represented as exact decimal strings. Child IDs always
follow their parent, so graph traversal does not require recursive object walking.

Rust nodes distinguish paths, namespaces, generic arguments, types, function signatures,
dyn bounds, binders, constants, identifiers and suffixes. Identifiers preserve LLVM
`Identifier.Name` and `Identifier.Punycode` as `value` and `encoding`; Punycode values
are encoded identifier payloads, not reconstructed Unicode display names.
`BasicType.type` uses LLVM enum names. Hex constants retain all digits, including
values beyond 64 bits. Decimal/base-62 values are exact decimal strings.
Backreferences retain `targetOffset` and any grammar LLVM visits at that target;
LLVM skips visiting targets in suppressed implementation/instantiating-crate paths.

Invalid names return `{ status: "invalid", ast: null, warnings: [...] }`.
Formatted failures additionally contain `text: null`; analysis results have no
`text` property. Allocation failures return `limit`. A fatal WASM trap returns
`error` and quarantines that instance: create a new demangler to continue.
Returned trees are detached plain objects. Loading/compilation failures reject initialization.

Only well-formed Unicode strings without control characters are accepted.
No wrapper input, depth, tree or output policy caps are imposed; WASM address-space,
memory and stack limits apply. LLVM supports Rust v0 (`_R`), not legacy Rust (`_ZN`), and retains its
recursion limit of 500.

For a bundler such as Vite, pass the emitted local WASM asset URL:

```js
import { createDemangler } from "llvm-rust-demangle";
import wasmURL from "llvm-rust-demangle/llvm-rust-demangle.wasm?url";
const api = await createDemangler({ wasmURL });
```

Pass `{ wasmBinary: Uint8Array }` for fully offline initialization. Bytes take
precedence over `wasmURL`. Node defaults to the adjacent packaged file; browsers
fetch that asset from your application. CSP needs
`script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'`.

Source commits, SHA-256 hashes and Emscripten version are pinned in `upstream.json`.
Build on Linux/WSL. `EMSDK_ROOT` can select an SDK at the exact pinned commit/version.
See [CONTRIBUTING.md](CONTRIBUTING.md) and [VERIFICATION.md](VERIFICATION.md).
`npm run upstream:update -- <llvm-tag-or-commit>` refreshes checksums; review the
instrumentation and generated schema, then run all gates before accepting an update.

Exports include `llvm-rust-demangle/ast-schema.json` and
`llvm-rust-demangle/build-info.json`. Wrapper code is MIT; LLVM and runtime
notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

References: [pinned LLVM parser](https://github.com/llvm/llvm-project/blob/0d261d1ca552c95a8f007e061c787ac7132fbcbc/llvm/lib/Demangle/RustDemangle.cpp),
[Rust RFC 2603](https://rust-lang.github.io/rfcs/2603-rust-symbol-name-mangling-v0.html).
