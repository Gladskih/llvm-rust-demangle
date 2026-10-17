import assert from "node:assert/strict";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length, 2, "Unrecognized upstream code: " + before);
  return source.replace(before, after);
}

// llvm/include/llvm/Demangle/Utility.h: grow against actual address-space bounds.
export function prepareUtility(source) {
  source = replaceOnce(source, "size_t Need = N + CurrentPosition;",
    "size_t Need = checkedAdd(N, CurrentPosition);");
  source = replaceOnce(source, "Need += 1024 - 32;", "Need = checkedAdd(Need, 1024 - 32);");
  source = replaceOnce(source, "BufferCapacity *= 2;",
    "if (BufferCapacity <= std::numeric_limits<size_t>::max() / 2) BufferCapacity *= 2;");
  source = replaceOnce(source,
    "Buffer = static_cast<char *>(std::realloc(Buffer, BufferCapacity));\n" +
    "      if (Buffer == nullptr)\n        std::abort();",
    "char *Replacement = static_cast<char *>(std::realloc(Buffer, BufferCapacity));\n" +
    "      if (Replacement == nullptr) throw std::bad_alloc{};\n      Buffer = Replacement;");
  return "#include \"safety.h\"\n" + source;
}

export function prepareOwnership(source) {
  source = replaceOnce(source, "using llvm::itanium_demangle::OutputBuffer;",
    "#include \"output-buffer.h\"\nusing OutputBuffer = ManagedOutputBuffer;");
  source = replaceOnce(source, "std::free(D.Output.getBuffer());", "");
  return replaceOnce(source, "return D.Output.getBuffer();", "return D.Output.release();");
}

await mkdir(".build/guarded/llvm/Demangle", { recursive: true });
await cp(".build/llvm/llvm/include/llvm/Demangle", ".build/guarded/llvm/Demangle", { recursive: true });
await writeFile(".build/guarded/llvm/Demangle/Utility.h", prepareUtility(await readFile(
  ".build/llvm/llvm/include/llvm/Demangle/Utility.h", "utf8")));
await writeFile(".build/parser.cpp", prepareOwnership(await readFile(
  ".build/llvm/llvm/lib/Demangle/RustDemangle.cpp", "utf8")));
