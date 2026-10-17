# Third-party notices

The wrapper and build scripts are MIT licensed. The WebAssembly binary includes LLVM
code under Apache-2.0 WITH LLVM-exception. See licenses/LLVM.txt and upstream.json
for the exact source revision, files and SHA-256 hashes.

Generated adaptations in .build/ check output allocation arithmetic, replace aborts
with allocation exceptions and give output buffers exception-safe ownership. The
checksummed upstream files remain unchanged. The parser's grammar is LLVM's.

The pinned Emscripten build links its runtime/system libraries. Redistribute:

- licenses/emscripten-LICENSE.txt and licenses/emscripten-AUTHORS.txt
- licenses/libcxx.txt, licenses/libcxxabi.txt, licenses/libunwind.txt
- licenses/compiler-rt.txt and licenses/musl.txt

These notices are copied from the pinned toolchain and checked in the npm archive.
