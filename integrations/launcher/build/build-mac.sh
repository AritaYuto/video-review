#!/usr/bin/env bash
set -euo pipefail

# --------------------------------------------------
# config
# --------------------------------------------------
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/installers/mac"
APP_NAME="videoreview-launcher"

PLATFORM="macOS"
ARCH="arm64"

# --------------------------------------------------
# build
# --------------------------------------------------
echo "== build ${PLATFORM} (${ARCH}) =="

mkdir -p "$OUT_DIR"
cd "$ROOT_DIR"

GOOS=darwin GOARCH=arm64 \
  go build \
    -trimpath \
    -ldflags="-s -w" \
    -o "$OUT_DIR/$APP_NAME" .

echo "output: $OUT_DIR/$APP_NAME"
echo "done"
