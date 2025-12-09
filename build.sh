#!/bin/bash

# LEGO Total Insiders Points Display - Build Script
# Creates distribution packages for Chrome (Brave), Firefox, and Edge stores

set -e  # Exit on error

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

# Directories
BUILD_DIR="dist"
SOURCE_DIR="."

# Files to include in all packages
COMMON_FILES=(
  "manifest.json"
  "content.js"
  "storage-bridge.js"
  "utils.js"
  "options.html"
  "options.js"
  "icons/icon-16.png"
  "icons/icon-48.png"
  "icons/icon-128.png"
  "icons/icon-256.png"
  "_locales/en/messages.json"
  "_locales/de/messages.json"
  #"_locales/fr/messages.json"
  #"_locales/es/messages.json"
  #"_locales/it/messages.json"
  #"_locales/nl/messages.json"
)

# Optional files (included if they exist)
OPTIONAL_FILES=(
  "README.md"
  "LICENSE"
  "CHANGELOG.md"
)

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   LEGO Total Insiders Points Display - Build Script      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if manifest.json exists
if [ ! -f "manifest.json" ]; then
  echo -e "${RED}✗ Error: manifest.json not found${NC}"
  echo "  Please run this script from the extension root directory"
  exit 1
fi

# Extract version from manifest.json
VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' manifest.json | grep -o '"[0-9.]*"' | tr -d '"')

if [ -z "$VERSION" ]; then
  echo -e "${RED}✗ Error: Could not extract version from manifest.json${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Version detected: ${VERSION}${NC}"
echo ""

# Clean previous builds
echo -e "${YELLOW}→ Cleaning previous builds...${NC}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
echo -e "${GREEN}✓ Build directory ready${NC}"
echo ""

# Validate required files
echo -e "${YELLOW}→ Validating required files...${NC}"
MISSING_FILES=0

for file in "${COMMON_FILES[@]}"; do
  if [ ! -f "$file" ] && [ ! -d "$file" ]; then
    echo -e "${RED}  ✗ Missing: $file${NC}"
    MISSING_FILES=$((MISSING_FILES + 1))
  fi
done

if [ $MISSING_FILES -gt 0 ]; then
  echo -e "${RED}✗ Build failed: $MISSING_FILES required file(s) missing${NC}"
  exit 1
fi

echo -e "${GREEN}✓ All required files present${NC}"
echo ""

# Function to create zip package
create_package() {
  local PLATFORM=$1
  local FILENAME="${BUILD_DIR}/lego-vip-points-${PLATFORM}-v${VERSION}.zip"
  local TEMP_DIR="${BUILD_DIR}/temp_${PLATFORM}"

  echo -e "${YELLOW}→ Building ${PLATFORM} package...${NC}"

  # Create temporary directory
  mkdir -p "$TEMP_DIR"

  # Copy common files
  for file in "${COMMON_FILES[@]}"; do
    if [ -f "$file" ]; then
      # Create directory structure if needed
      FILE_DIR=$(dirname "$file")
      mkdir -p "$TEMP_DIR/$FILE_DIR"
      cp "$file" "$TEMP_DIR/$file"
    elif [ -d "$file" ]; then
      # Copy entire directory
      mkdir -p "$TEMP_DIR/$file"
      cp -r "$file"/* "$TEMP_DIR/$file/"
    fi
  done

  # Copy optional files
  for file in "${OPTIONAL_FILES[@]}"; do
    if [ -f "$file" ]; then
      cp "$file" "$TEMP_DIR/$file"
    fi
  done

  # Platform-specific modifications can go here
  # (Currently all platforms use the same manifest)

  # Create zip file
  cd "$TEMP_DIR"
  zip -r -q "../../$FILENAME" ./*
  cd - > /dev/null

  # Cleanup temp directory
  rm -rf "$TEMP_DIR"

  # Get file size
  FILE_SIZE=$(du -h "$FILENAME" | cut -f1)

  echo -e "${GREEN}  ✓ Created: $(basename $FILENAME) (${FILE_SIZE})${NC}"
}

# Build packages for each platform
create_package "chrome"
create_package "firefox"
create_package "edge"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Build Summary                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Version:${NC} ${VERSION}"
echo -e "${GREEN}✓ Packages created:${NC}"
ls -lh "$BUILD_DIR"/*.zip | awk '{print "  • " $9 " (" $5 ")"}'
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test each package by loading it in the respective browser"
echo "  2. Upload to store submission pages:"
echo "     • Chrome Web Store: https://chrome.google.com/webstore/devconsole"
echo "     • Firefox Add-ons: https://addons.mozilla.org/developers/"
echo "     • Microsoft Edge: https://partner.microsoft.com/dashboard"
echo ""
echo -e "${GREEN}Build completed successfully! 🎉${NC}"
