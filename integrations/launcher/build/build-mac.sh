#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")"/.. && pwd)"
OUT="$ROOT/installers/mac"
APP="videoreview-launcher"

mkdir -p "$OUT"

echo "== build macOS (arm64) =="
cd $ROOT

GOOS=darwin GOARCH=arm64 \
  go build -trimpath -ldflags="-s -w" \
  -o "$OUT/$APP" .

echo "done: $OUT/$APP"
