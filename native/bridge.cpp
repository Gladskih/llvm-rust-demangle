#include "llvm/Demangle/Demangle.h"
#include "json.h"
#include <cstdlib>
#include <limits>
#include <memory>
#include <string>
#include <vector>

namespace {
std::vector<char> input;
std::string result;

const char *failure(const char *status, const char *warning) {
  Json json;
  json.raw("{");
  json.key("status"); json.string(status);
  json.key("text"); json.raw("null");
  json.key("warnings"); json.raw("["); json.string(warning); json.raw("]}");
  result = json.result();
  return result.data();
}

const char *parse(size_t length) {
  if (input.empty() || length >= input.size() || input[length] != 0)
    return failure("invalid", "Invalid input buffer bounds.");
  std::unique_ptr<char, decltype(&std::free)> text(
    llvm::rustDemangle(std::string_view(input.data(), length)), &std::free);
  if (!text) return failure("invalid", "LLVM rejected this mangled name or its recursion depth.");
  Json json;
  json.raw("{");
  json.key("status"); json.string("success");
  json.key("text"); json.string(text.get());
  json.key("warnings"); json.raw("[]}");
  result = json.result();
  return result.data();
}
}

extern "C" char *input_buffer(size_t length) noexcept {
  if (length == std::numeric_limits<size_t>::max()) return nullptr;
  try {
    input.resize(length + 1);
    return input.data();
  } catch (const std::exception &) { return nullptr; }
}

extern "C" const char *demangle(size_t length) noexcept {
  try { return parse(length); }
  catch (const std::bad_alloc &) {
    try { return failure("limit", "Unable to allocate LLVM memory."); }
    catch (...) { return nullptr; }
  }
}

extern "C" size_t result_size() { return result.size(); }
