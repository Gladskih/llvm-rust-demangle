#pragma once
#include <cstdint>
#include <string_view>

// Unicode Standard, Table 3-7: reject overlong sequences, surrogates and > U+10FFFF.
inline size_t utf8Width(unsigned char first) {
  if (first >= 0xc2 && first <= 0xdf) return 2;
  if (first >= 0xe0 && first <= 0xef) return 3;
  if (first >= 0xf0 && first <= 0xf4) return 4;
  return first < 0x80 ? 1 : 0;
}

inline bool validUtf8Code(uint32_t code, size_t length) {
  if (length == 3 && code < 0x800) return false;
  if (length == 4 && code < 0x10000) return false;
  return code <= 0x10ffff && (code < 0xd800 || code > 0xdfff);
}

inline size_t utf8Length(std::string_view text, size_t position) {
  if (position >= text.size()) return 0;
  const unsigned char first = text[position];
  const size_t length = utf8Width(first);
  if (length <= 1) return length;
  if (length > text.size() - position) return 0;
  uint32_t code = first & (0x7f >> length);
  for (size_t index = 1; index < length; ++index) {
    const unsigned char byte = text[position + index];
    if ((byte & 0xc0) != 0x80) return 0;
    code = (code << 6) | (byte & 0x3f);
  }
  return validUtf8Code(code, length) ? length : 0;
}
