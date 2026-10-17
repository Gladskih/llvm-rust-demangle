#pragma once
#include "safety.h"
#include "utf8.h"
#include <cstdint>
#include <string>
#include <string_view>
#include <vector>

class Json {
  std::string text;
  std::vector<bool> first;
  void append(std::string_view value) {
    text.append(value);
  }
public:
  void raw(std::string_view value) {
    if (value == "{") first.push_back(true);
    if (value == "}") first.pop_back();
    append(value);
  }
  void string(std::string_view value) {
    raw("\"");
    for (size_t index = 0; index < value.size();) {
      const unsigned char byte = value[index];
      const size_t length = utf8Length(value, index);
      if (length && byte >= 0x20 && byte != '"' && byte != '\\') {
        append(value.substr(index, length));
        index += length;
      } else {
        // Invalid UTF-8 bytes remain representable without damaging the JSON envelope.
        const char hex[] = "0123456789abcdef";
        const char escape[] = {'\\', 'u', '0', '0', hex[byte >> 4], hex[byte & 15]};
        raw(std::string_view(escape, sizeof(escape)));
        ++index;
      }
    }
    raw("\"");
  }
  void key(std::string_view name) {
    if (!first.back()) raw(",");
    first.back() = false;
    string(name);
    raw(":");
  }
  template <class Integer> void number(Integer value) { raw(std::to_string(value)); }
  void boolean(bool value) { raw(value ? "true" : "false"); }
  const std::string &result() const { return text; }
};
