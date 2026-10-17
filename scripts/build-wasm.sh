#!/usr/bin/env bash
set -euo pipefail
export SOURCE_DATE_EPOCH=0
cd "$(dirname "$0")/.."
mkdir -p .build/llvm/llvm/include/llvm/Config artifacts licenses
node scripts/fetch-sources.mjs
readarray -t PINS < <(node --input-type=module -e '
  import fs from "node:fs";
  const pin = JSON.parse(fs.readFileSync("upstream.json"));
  console.log(pin.emsdkCommit); console.log(pin.emscriptenVersion);')
SDK=${EMSDK_ROOT:-"$PWD/.build/emsdk"}
if [[ -n ${EMSDK_ROOT:-} ]]; then
  test "$(git -C "$SDK" rev-parse HEAD)" = "${PINS[0]}"
else
  if [[ ! -d "$SDK/.git" ]]; then
    git clone https://github.com/emscripten-core/emsdk.git "$SDK"
  fi
  git -C "$SDK" fetch origin "${PINS[0]}"
  git -C "$SDK" checkout --detach "${PINS[0]}"
  "$SDK/emsdk" install "${PINS[1]}"
  "$SDK/emsdk" activate "${PINS[1]}"
fi
set +u
source "$SDK/emsdk_env.sh"
set -u
emcc --version | head -1 | grep -F " ${PINS[1]} "
# LLVM's standalone demangler needs no configuration beyond static export visibility.
printf '#pragma once\n#define LLVM_BUILD_STATIC 1\n' > .build/llvm/llvm/include/llvm/Config/llvm-config.h
node scripts/prepare-parser.mjs
INCLUDES=(-I .build/guarded -I .build/llvm/llvm/include -I native)
em++ -std=c++17 -Oz -flto -fwasm-exceptions -fno-rtti -UNDEBUG "${INCLUDES[@]}" \
  -Wall -Wextra -Werror -Wno-unused-parameter \
  native/bridge.cpp .build/parser.cpp \
  --no-entry -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker,node \
  -sWASM_LEGACY_EXCEPTIONS=0 -sMIN_NODE_VERSION=240000 \
  -sDYNAMIC_EXECUTION=0 -sFILESYSTEM=0 -sALLOW_MEMORY_GROWTH=1 \
  -sINITIAL_MEMORY=4194304 -sMAXIMUM_MEMORY=4GB -sSTACK_SIZE=1048576 \
  -sABORTING_MALLOC=0 -sASSERTIONS=1 -sSTACK_OVERFLOW_CHECK=2 \
  '-sEXPORTED_FUNCTIONS=["_input_buffer","_demangle","_result_size"]' \
  '-sEXPORTED_RUNTIME_METHODS=["HEAPU8"]' -o artifacts/llvm-rust-demangle.js
cp .build/llvm/llvm/LICENSE.TXT licenses/LLVM.txt
cp "$SDK/upstream/emscripten/LICENSE" licenses/emscripten-LICENSE.txt
cp "$SDK/upstream/emscripten/AUTHORS" licenses/emscripten-AUTHORS.txt
cp "$SDK/upstream/emscripten/system/lib/libcxx/LICENSE.TXT" licenses/libcxx.txt
cp "$SDK/upstream/emscripten/system/lib/libcxxabi/LICENSE.TXT" licenses/libcxxabi.txt
cp "$SDK/upstream/emscripten/system/lib/libunwind/LICENSE.TXT" licenses/libunwind.txt
cp "$SDK/upstream/emscripten/system/lib/libc/musl/COPYRIGHT" licenses/musl.txt
cp "$SDK/upstream/emscripten/system/lib/compiler-rt/LICENSE.TXT" licenses/compiler-rt.txt
node scripts/build.mjs
