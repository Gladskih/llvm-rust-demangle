# Verification and contribution audit

Validated locally on 2026-10-17 using Windows Node 24.19.0 and Linux/WSL Node 26.11.1.
LLVM and Emscripten inputs are pinned by commit and source checksums in upstream.json.

- npm ci and the pinned Emscripten WASM build succeed.
- ESLint and strict TypeScript checks pass.
- JavaScript statement, branch and function coverage: 100%.
- All 19 focused mutation tests are killed by semantic or boundary assertions.
- 152 upstream expectations pass (FileCheck whitespace rules for lit checks).
- 4180 valid/malformed names match the unmodified native LLVM implementation exactly.
- Native arithmetic, UTF-8, JSON, buffer ownership and corpus tests pass ASan/UBSan
  with leak detection. These finite tests are evidence, not proof for every input.
- Chromium tests pass with strict CSP, offline bytes and module workers.
- The exact npm tarball installs and works on Windows and Linux without dependencies.

The final contribution audit checks cohesive modules, small functions, double quotes,
explicit configuration, no boolean control parameters or argument bags, no repeated
parsing, plain detached results and diagnostics, bounds-checked memory, immutable
source pins, fail-closed safety patch insertion points and complete license packaging.
No external service is involved in runtime analysis. No wrapper input/output caps
are added. Resource exhaustion is reported; fatal WASM traps quarantine the instance.

Rust supports LLVM's v0 grammar only and retains LLVM's recursion limit of 500.
The parsers produce text directly and expose no AST. An AST would require a separate
source-level instrumentation design. Upstream behavior is not inferred from output text.

CI is configured for Linux builds and Windows/Linux Node 24/26 consumers; hosted CI
has not been executed for these local repositories. GitHub and npm publication have
not been performed. Do not describe these packages as published releases.
