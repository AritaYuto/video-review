#!/bin/bash
set -e

SDK=$(xcrun --sdk macosx --show-sdk-path)

clang++ -dynamiclib -framework AppKit -isysroot "$SDK" -arch arm64 FocusWindow.mm -o arm64.dylib
clang++ -dynamiclib -framework AppKit -isysroot "$SDK" -arch x86_64 FocusWindow.mm -o x64.dylib
lipo -create arm64.dylib x64.dylib -output libFocusWindow.dylib
rm arm64.dylib x64.dylib
