bool parseSymbol(Graph &graph, std::string_view input, Presentation mode, std::string &text) {
  Demangler parser(graph, mode);
  const size_t root = graph.begin("Symbol", 0);
  const bool valid = parser.demangle(input);
  graph.finish(root, input.size());
  if (mode == Presentation::Omit) {
    if (parser.Output.getCurrentPosition() != 0) throw std::logic_error("Analysis produced text");
  } else if (valid) {
    text.assign(parser.Output.getBuffer(), parser.Output.getCurrentPosition());
  }
  return valid;
}
