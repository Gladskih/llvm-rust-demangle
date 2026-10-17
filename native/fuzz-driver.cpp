#include <cassert>
#include <cstring>
#include <iostream>
#include <limits>
#include <string>

extern "C" char *input_buffer(size_t);
extern "C" const char *demangle(size_t);
extern "C" size_t result_size();

int main() {
  assert(input_buffer(std::numeric_limits<size_t>::max()) == nullptr);
  assert(std::strstr(demangle(0), "invalid"));
  std::string input;
  while (std::getline(std::cin, input)) {
    char *buffer = input_buffer(input.size());
    assert(buffer);
    std::memcpy(buffer, input.data(), input.size());
    buffer[input.size()] = 0;
    const char *result = demangle(input.size());
    assert(result && result_size() > 0);
    assert(std::strstr(result, "status"));
    assert(std::strstr(demangle(input.size() + 1), "invalid"));
  }
}
