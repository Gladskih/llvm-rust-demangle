#pragma once
#include <cstddef>
#include <limits>
#include <new>

// Check arithmetic against the target address space, without imposing a policy cap.
inline size_t checkedAdd(size_t left, size_t right) {
  if (right > std::numeric_limits<size_t>::max() - left) throw std::bad_alloc{};
  return left + right;
}

inline size_t checkedMultiply(size_t left, size_t right) {
  if (right && left > std::numeric_limits<size_t>::max() / right) throw std::bad_alloc{};
  return left * right;
}
