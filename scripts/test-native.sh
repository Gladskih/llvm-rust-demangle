#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/corpus.mjs
clang++ -std=c++17 -O1 -g -fno-omit-frame-pointer \
  -fsanitize=address,undefined -fno-sanitize-recover=all \
  -I .build/guarded -I .build/llvm/llvm/include -I native \
  native/safety-test.cpp -o .build/safety-native
ASAN_OPTIONS=detect_leaks=1 .build/safety-native
for module in graph; do
  clang++ -std=c++17 -O1 -g -fno-omit-frame-pointer \
    -fsanitize=address,undefined -fno-sanitize-recover=all \
    -I .build/guarded -I .build/llvm/llvm/include -I native \
    "native/$module-test.cpp" -o ".build/$module-native"
  ASAN_OPTIONS=detect_leaks=1 ".build/$module-native"
done
clang++ -std=c++17 -O1 -g -fno-omit-frame-pointer \
  -fsanitize=address,undefined -fno-sanitize-recover=all \
  -I .build/guarded -I .build/llvm/llvm/include -I native \
  native/bridge.cpp native/fuzz-driver.cpp .build/parser.cpp -o .build/fuzz-native
ASAN_OPTIONS=detect_leaks=1 .build/fuzz-native < .build/fuzz.txt
clang++ -std=c++17 -O2 -I .build/llvm/llvm/include -include llvm/Demangle/ItaniumDemangle.h \
  native/oracle.cpp .build/llvm/llvm/lib/Demangle/RustDemangle.cpp -o .build/oracle

node scripts/test-native-mutations.mjs
