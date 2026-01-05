#!/usr/bin/env bash
set -euo pipefail

# --------------------------------------------------
# paths
# --------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# --------------------------------------------------
# config
# --------------------------------------------------
BIN_NAME="videoreview-launcher"
APP_NAME="VideoReview Launcher.app"

BIN_PATH="$SCRIPT_DIR/$BIN_NAME"
PLIST_PATH="$SCRIPT_DIR/Info.plist"
BRIDGE_SCRIPT_PATH="$SCRIPT_DIR/videoreview-bridge.script"

INSTALL_BASE="$HOME/Applications/VideoReview"
APP_DIR="$INSTALL_BASE/$APP_NAME"

CONTENTS_DIR="$APP_DIR/Contents"
RESOURCES_DIR="$CONTENTS_DIR/Resources"

TMP_BRIDGE_APP="$(mktemp -d)/temp-videoreview-bridge.app"

# --------------------------------------------------
# install
# --------------------------------------------------
echo "== Install VideoReview Launcher (macOS) =="

# Check prerequisites
echo "Checking prerequisites..."

[ -f "$BIN_PATH" ] || { echo "ERROR: binary not found: $BIN_PATH"; exit 1; }
[ -f "$PLIST_PATH" ] || { echo "ERROR: Info.plist not found: $PLIST_PATH"; exit 1; }
[ -f "$BRIDGE_SCRIPT_PATH" ] || { echo "ERROR: bridge script not found: $BRIDGE_SCRIPT_PATH"; exit 1; }

# Create app bundle
echo "Creating app bundle..."

rm -rf "$APP_DIR"

osacompile -o "$TMP_BRIDGE_APP" -x "$BRIDGE_SCRIPT_PATH"
cp -r "$TMP_BRIDGE_APP" "$APP_DIR"

mkdir -p "$RESOURCES_DIR"
cp "$BIN_PATH" "$RESOURCES_DIR/$BIN_NAME"
chmod +x "$RESOURCES_DIR/$BIN_NAME"

cp "$PLIST_PATH" "$CONTENTS_DIR/Info.plist"

# Remove quarantine attributes
echo "Removing quarantine attributes..."
xattr -dr com.apple.quarantine "$APP_DIR" || true

# Codesign
echo "Signing app bundle..."
codesign --force --deep --sign - "$APP_DIR" || true
codesign -dv --verbose=4 "$APP_DIR" 2>&1 | head || true

# Register URL scheme
echo "Registering URL scheme (videoreview://)..."

/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -u "$APP_DIR" || true

# /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
#   -kill -r -domain user

/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "$APP_DIR" || true

echo "Installed to: $APP_DIR"
echo "done"
