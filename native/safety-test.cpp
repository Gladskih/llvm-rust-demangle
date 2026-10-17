#include "output-buffer.h"
#include "json.h"
#include <cassert>
#include <cstring>
#include <limits>

using namespace std::string_view_literals;

static void testUtf8() {
  assert(utf8Length("", 0) == 0);
  assert(utf8Length("A", 1) == 0);
  assert(utf8Length("A", std::numeric_limits<size_t>::max()) == 0);
  assert(utf8Length("A", 0) == 1);
  assert(utf8Length("\xc2\xa2", 0) == 2);
  assert(utf8Length("\xe2\x82\xac", 0) == 3);
  assert(utf8Length("\xf0\x9f\x98\x8a", 0) == 4);
  assert(utf8Length("\x80", 0) == 0);
  assert(utf8Length("\xc0\xaf", 0) == 0);
  assert(utf8Length("\xe0\x80\xaf", 0) == 0);
  assert(utf8Length("\xf0\x80\x80\xaf", 0) == 0);
  assert(utf8Length("\xed\xa0\x80", 0) == 0);
  assert(utf8Length("\xf4\x90\x80\x80", 0) == 0);
  assert(utf8Length("\xf0\x9f", 0) == 0);
  assert(utf8Length("\xe2\x28\xa1", 0) == 0);
  assert(utf8Length("\xf5\x80\x80\x80", 0) == 0);
}

static void testJson() {
  Json out;
  out.string("\xf0\x9f\x98\x8a\xff\0\"\\"sv);
  assert(out.result() == "\"\xf0\x9f\x98\x8a\\u00ff\\u0000\\u0022\\u005c\"");
}

static void testArithmetic() {
  const size_t maximum = std::numeric_limits<size_t>::max();
  assert(checkedAdd(maximum - 1, 1) == maximum);
  assert(checkedMultiply(0, maximum) == 0);
  assert(checkedMultiply(maximum, 1) == maximum);
  try { checkedAdd(maximum, 1); assert(false); }
  catch (const std::bad_alloc &) {}
  try { checkedMultiply(maximum, 2); assert(false); }
  catch (const std::bad_alloc &) {}
}

static void testOutputBuffer() {
  ManagedOutputBuffer buffer;
  buffer += "owned";
  assert(buffer.getCurrentPosition() == 5);
  ManagedOutputBuffer released;
  released += "released";
  char *text = released.release();
  assert(std::string_view(text, 8) == "released");
  std::free(text);
}

int main() { testUtf8(); testJson(); testArithmetic(); testOutputBuffer(); }
