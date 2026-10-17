# Contributing

Follow the pinned LLVM implementation and tests. Parsing and execution stay local in
the browser; consumers have no dependencies. Never reconstruct an AST from printed text.
These LLVM parsers produce text directly and expose no AST. Rust supports v0 only.
Keep upstream behavior, including its documented recursion limit; add no wrapper policy caps.

Use small cohesive modules, double quotes, const by default, descriptive names, functions
generally under 30 lines (never over 50), complexity below 10 and 100-column lines.
Avoid boolean control parameters, argument bags, single-use constants, generic helper
modules, redundant result fields, and repeated parsing. Use imperative commit messages.
Bounds-check offsets, lengths, pointers and arithmetic. Malformed names return warnings;
a fatal WASM trap quarantines the instance. Preserve licenses and immutable source pins.
Generated safety patches must fail if their upstream insertion points change.

Test every public behavior and meaningful invalid/boundary case. First verify new tests
fail for the missing behavior. Keep tests flat and expectations independent of production
constants. Mutation tests must expose weak assertions. JS coverage is 100% for lines,
branches and functions. Test native code with ASan/UBSan and compare against unpatched LLVM.

Before reporting success or releasing, run:

```sh
npm ci
npm run build:wasm
npm run test:native
npm run test:differential
npx playwright install --with-deps chromium
npm run verify
npm run pack:verified
```

Explicitly audit final changes against these rules. CI checks Linux/Windows consumers
on the exact tarball. Publish only a tested artifact after publication is requested.
Use npm Trusted Publishing with provenance for automated releases, never a long-lived token.
