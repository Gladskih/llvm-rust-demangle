#include <cassert>
#include <cstring>
#include <iostream>
#include <string>

extern "C" char *input_buffer(size_t);
extern "C" const char *demangle(size_t);

int main() {
  std::string input;
  while (std::getline(std::cin, input)) {
    char *buffer = input_buffer(input.size());
    assert(buffer);
    std::memcpy(buffer, input.data(), input.size());
    buffer[input.size()] = 0;
    const char *result = demangle(input.size());
    assert(result);
    std::cout << result << '\n';
  }
}
