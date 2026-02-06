# React Native Patches

This directory contains patches applied via [`patch-package`](https://github.com/ds300/patch-package). Patches are automatically applied after `npm install` via the `postinstall` script.

## react-native+0.76.9.patch

### Problem

React Native's JavaScriptCore (JSC) runtime has `JSCRuntime::createArrayBuffer()` stubbed with `throw std::logic_error("Not implemented")`. This method is part of the JSI (JavaScript Interface) abstraction layer and is called whenever native C++ code needs to return an `ArrayBuffer` to JavaScript.

This causes any library that uses NitroModules (or similar JSI-based frameworks) to fail when returning binary data from native code. In our case, `react-native-quick-crypto`'s `Hash.digest()`, `SubtleCrypto.digest()`, and other methods that return `ArrayBuffer` all throw:

```
Error: Hash.digest(...): Not implemented
```

The error originates from the JSI layer, not from the crypto library itself.

### Why JSC?

This app uses JSC instead of Hermes because `@automerge/automerge` requires WebAssembly support, which Hermes does not provide. JSC has native WebAssembly support on iOS.

### Fix

The patch implements `JSCRuntime::createArrayBuffer()` using the JavaScriptCore C API function `JSObjectMakeArrayBufferWithBytesNoCopy()`, which has been available since iOS 10.0. The implementation:

1. Moves the `shared_ptr<MutableBuffer>` into heap-allocated storage
2. Creates a JSC ArrayBuffer that directly references the buffer's memory (zero-copy)
3. Registers a deallocator callback that releases the `shared_ptr` when the JS garbage collector collects the ArrayBuffer

This is the same approach that Hermes uses internally for its `createArrayBuffer` implementation.

### Affected file

`node_modules/react-native/ReactCommon/jsc/JSCRuntime.cpp` — `JSCRuntime::createArrayBuffer()`

### When can this patch be removed?

This patch can be removed when either:
- React Native implements `createArrayBuffer()` in their JSC runtime (track [facebook/react-native](https://github.com/facebook/react-native))
- The app switches to Hermes (if/when Hermes gains WebAssembly support)
- The app no longer needs JSC (if automerge ships a non-WASM build)
