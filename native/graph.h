#pragma once
#include "json.h"
#include <cassert>
#include <cstdint>
#include <iterator>
#include <stdexcept>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

enum class Presentation { Omit, Include };

struct ParseNode {
  std::string_view kind;
  size_t start;
  size_t end;
  std::vector<size_t> children;
  std::vector<std::pair<std::string_view, std::string>> fields;
};

// Append-only parse state: stable integer IDs survive vector reallocations.
class Graph {
  std::string_view input;
  std::vector<size_t> stack;
  void writeNode(Json &json, const ParseNode &node) const {
    json.raw("{");
    json.key("kind"); json.string(node.kind);
    json.key("start"); json.number(node.start);
    json.key("end"); json.number(node.end);
    json.key("children"); json.raw("[");
    for (size_t index = 0; index < node.children.size(); ++index) {
      if (index) json.raw(",");
      json.number(node.children[index]);
    }
    json.raw("]");
    for (const auto &field : node.fields) {
      json.key(field.first); json.string(field.second);
    }
    json.raw("}");
  }
public:
  std::vector<ParseNode> nodes;
  explicit Graph(std::string_view input) : input(input) {}
  size_t begin(std::string_view kind, size_t start) {
    const size_t id = nodes.size();
    nodes.push_back({kind, start, start, {}, {}});
    if (!stack.empty()) nodes[stack.back()].children.push_back(id);
    stack.push_back(id);
    return id;
  }
  void finish(size_t id, size_t end) noexcept {
    assert(!stack.empty() && stack.back() == id);
    nodes[id].end = end;
    stack.pop_back();
  }
  void field(size_t id, std::string_view key, std::string value) {
    nodes[id].fields.emplace_back(key, std::move(value));
  }
  void field(std::string_view key, std::string value) {
    field(stack.back(), key, std::move(value));
  }
  void kind(std::string_view value) { nodes[stack.back()].kind = value; }
  size_t position(std::string_view remaining) const {
    if (remaining.data() == nullptr) return 0;
    const uintptr_t begin = reinterpret_cast<uintptr_t>(input.data());
    const uintptr_t pointer = reinterpret_cast<uintptr_t>(remaining.data());
    if (pointer < begin || pointer - begin > input.size()) throw std::out_of_range("Parser view");
    return pointer - begin;
  }
  void write(Json &json) const {
    json.raw("{");
    json.key("root"); json.number(0);
    json.key("nodes"); json.raw("[");
    for (size_t index = 0; index < nodes.size(); ++index) {
      const auto &node = nodes[index];
      if (node.start > node.end || node.end > input.size()) throw std::out_of_range("AST range");
      if (index) json.raw(",");
      writeNode(json, node);
    }
    json.raw("]}");
  }
};

class RustScope {
  Graph &graph;
  const size_t &position;
  size_t id;
public:
// RFC 2603: the grammar cursor excludes the two-byte _R prefix.
  RustScope(Graph &graph, std::string_view kind, const size_t &position)
    : RustScope(graph, kind, position, checkedAdd(position, 2)) {}
  RustScope(Graph &graph, std::string_view kind, const size_t &position, size_t start)
    : graph(graph), position(position), id(graph.begin(kind, start)) {}
  ~RustScope() { graph.finish(id, position + 2); }
  uint64_t number(uint64_t value) {
    graph.field(id, "value", std::to_string(value));
    return value;
  }
};

class DScope {
  Graph &graph;
  const std::string_view &remaining;
  size_t id;
public:
  DScope(Graph &graph, std::string_view kind, const std::string_view &remaining)
    : graph(graph), remaining(remaining), id(graph.begin(kind, graph.position(remaining))) {}
  ~DScope() { graph.finish(id, graph.position(remaining)); }
};

bool parseSymbol(Graph &graph, std::string_view input, Presentation mode, std::string &text);
