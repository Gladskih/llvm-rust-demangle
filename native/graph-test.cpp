#include "graph.h"
#include <cassert>
#include <limits>

static void testScopes() {
  Graph graph("_Rabcd");
  const size_t root = graph.begin("Symbol", 0);
  size_t position = 0;
  {
    RustScope scope(graph, "Number", position);
    scope.number(std::numeric_limits<uint64_t>::max());
    position = 4;
  }
  graph.finish(root, 6);
  assert(graph.nodes.size() == 2);
  assert(graph.nodes[0].children[0] == 1);
  assert(graph.nodes[1].start == 2 && graph.nodes[1].end == 6);
  Json json;
  graph.write(json);
  assert(json.result().find("18446744073709551615") != std::string::npos);
}

static void testBounds() {
  const std::string_view input = "_D3fooi";
  Graph graph(input);
  std::string_view remaining = input.substr(2);
  { DScope scope(graph, "Identifier", remaining); remaining.remove_prefix(4); }
  assert(graph.nodes[0].start == 2 && graph.nodes[0].end == 6);
  assert(graph.position({}) == 0);
  const size_t root = graph.begin("Symbol", 0);
  graph.finish(root, input.size() + 1);
  Json json;
  try { graph.write(json); assert(false); }
  catch (const std::out_of_range &) {}
}

static void testStableIds() {
  Graph graph("input");
  const size_t root = graph.begin("Symbol", 0);
  for (size_t index = 0; index < 4096; ++index) {
    const size_t child = graph.begin("Part", 0);
    graph.field(child, "value", "value");
    graph.finish(child, 5);
  }
  graph.finish(root, 5);
  assert(graph.nodes[0].children.size() == 4096);
  assert(graph.nodes[4096].fields[0].second == "value");
}

int main() { testScopes(); testBounds(); testStableIds(); }
