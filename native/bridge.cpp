#include "graph.h"
#include <limits>
#include <string>
#include <vector>

namespace {
std::vector<char> input;
std::string result;

const char *failure(const char *status, const char *warning, Presentation mode) {
  Json json;
  json.raw("{");
  json.key("status"); json.string(status);
  json.key("ast"); json.raw("null");
  if (mode == Presentation::Include) { json.key("text"); json.raw("null"); }
  json.key("warnings"); json.raw("["); json.string(warning); json.raw("]}");
  result = json.result();
  return result.data();
}

const char *parse(size_t length, Presentation mode) {
  if (input.empty() || length >= input.size() || input[length] != 0)
    return failure("invalid", "Invalid input buffer bounds.", mode);
  Graph graph(std::string_view(input.data(), length));
  std::string text;
  if (!parseSymbol(graph, std::string_view(input.data(), length), mode, text))
    return failure("invalid", "LLVM rejected this mangled name or its recursion depth.", mode);
  Json json;
  json.raw("{");
  json.key("status"); json.string("success");
  json.key("ast"); graph.write(json);
  if (mode == Presentation::Include) { json.key("text"); json.string(text); }
  json.key("warnings"); json.raw("[]}");
  result = json.result();
  return result.data();
}

const char *run(size_t length, Presentation mode) noexcept {
  try { return parse(length, mode); }
  catch (const std::bad_alloc &) {
    try { return failure("limit", "Unable to allocate LLVM memory.", mode); }
    catch (...) { return nullptr; }
  } catch (const std::exception &error) {
    try { return failure("error", error.what(), mode); }
    catch (...) { return nullptr; }
  }
}
}

extern "C" char *input_buffer(size_t length) noexcept {
  if (length == std::numeric_limits<size_t>::max()) return nullptr;
  try {
    input.resize(length + 1);
    return input.data();
  } catch (const std::exception &) { return nullptr; }
}

extern "C" const char *demangle(size_t length) noexcept { return run(length, Presentation::Omit); }
extern "C" const char *demangle_with_text(size_t length) noexcept {
  return run(length, Presentation::Include);
}
extern "C" size_t result_size() { return result.size(); }
