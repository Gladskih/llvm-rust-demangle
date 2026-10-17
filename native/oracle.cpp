#include "llvm/Demangle/ItaniumDemangle.h"
#include "llvm/Demangle/Demangle.h"
#include <cstdlib>
#include <iostream>
#include <string>

int main() {
  std::string input;
  while (std::getline(std::cin, input)) {
    char *text = llvm::rustDemangle(input);
    std::cout << (text ? text : "<invalid>") << '\n';
    std::free(text);
  }
}
