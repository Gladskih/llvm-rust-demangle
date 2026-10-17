#pragma once
#include "llvm/Demangle/ItaniumDemangle.h"
#include "llvm/Demangle/Utility.h"
#include <cstdlib>

// LLVM normally frees these buffers manually. Allocation failures can unwind a print.
class ManagedOutputBuffer : public llvm::itanium_demangle::OutputBuffer {
  bool ownsBuffer = true;
public:
  ~ManagedOutputBuffer() override { if (ownsBuffer) std::free(getBuffer()); }
  char *release() { ownsBuffer = false; return getBuffer(); }
};
