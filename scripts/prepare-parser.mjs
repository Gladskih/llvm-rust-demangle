import { assertRuleTags } from "./cpp-function.mjs";
import { generateSchema } from "./generate-schema.mjs";
import { instrumentRust } from "./instrument-rust.mjs";
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
const original = await readFile(".build/llvm/llvm/lib/Demangle/RustDemangle.cpp", "utf8");
const basicTypes = original.match(/enum class BasicType \{([\s\S]*?)\};/)[1]
  .split(",").map(value => value.trim()).filter(Boolean);
await generateSchema(basicTypes);
assert(basicTypes.every(name => /^[A-Za-z][A-Za-z0-9]*$/.test(name)), "Changed LLVM enum layout");
const basicSwitch = "static std::string astBasicType(BasicType type) {\n" +
  "  static constexpr std::string_view names[] = {" + basicTypes.map(name => JSON.stringify(name)).join(",") + "};\n" +
  "  const size_t index = static_cast<size_t>(type);\n" +
  "  if (index >= std::size(names)) throw std::logic_error(\"Unknown LLVM type\");\n" +
  "  return std::string(names[index]);\n}\n";
const tags = JSON.parse(await readFile("scripts/grammar-tags.json"));
assertRuleTags(original, "bool Demangler::demanglePath(IsInType InType, LeaveGenericsOpen LeaveOpen)", Object.keys(tags.paths));
assertRuleTags(original, "void Demangler::demangleType()", Object.keys(tags.types));
const kindSwitches = Object.entries(tags).map(([group, kinds]) =>
  "static std::string_view ast" + (group === "paths" ? "Path" : "Type") + "Kind(char tag) {\n" +
  "  static constexpr std::pair<char, std::string_view> names[] = {" +
  Object.entries(kinds).map(([tag, kind]) => "{'" + tag + "', \"" + kind + "\"}").join(",") + "};\n" +
  "  for (const auto &entry : names) if (entry.first == tag) return entry.second;\n" +
  "  return \"NamedType\";\n}\n").join("\n");
await writeFile(".build/parser.cpp", instrumentRust(prepareOwnership(original), basicSwitch, kindSwitches));
