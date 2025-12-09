#!/bin/bash

# Validation script to check extension before building

set -e

echo "🔍 Validating extension files..."
echo ""

ERRORS=0
WARNINGS=0

# Check manifest.json syntax
echo "→ Checking manifest.json..."
if command -v jq &> /dev/null; then
  if jq empty manifest.json 2>/dev/null; then
    echo "  ✓ Valid JSON syntax"
  else
    echo "  ✗ Invalid JSON syntax in manifest.json"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ⚠ jq not found, skipping JSON validation"
  WARNINGS=$((WARNINGS + 1))
fi

# Check for required manifest fields
REQUIRED_FIELDS=("name" "version" "description" "manifest_version")
for field in "${REQUIRED_FIELDS[@]}"; do
  if grep -q "\"$field\"" manifest.json; then
    echo "  ✓ Field '$field' present"
  else
    echo "  ✗ Required field '$field' missing"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# Check icon files
echo "→ Checking icon files..."
for size in 16 48 128; do
  ICON_FILE="icons/icon-${size}.png"
  if [ -f "$ICON_FILE" ]; then
    # Check if it's actually a PNG
    if file "$ICON_FILE" | grep -q "PNG"; then
      echo "  ✓ icon-${size}.png exists and is valid PNG"
    else
      echo "  ✗ icon-${size}.png is not a valid PNG file"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo "  ✗ Missing icon-${size}.png"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# Check JavaScript files
echo "→ Checking JavaScript files..."
JS_FILES=("content.js" "storage-bridge.js" "options.js")

for file in "${JS_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file exists"
    
    # Basic syntax check (optional, requires node)
    if command -v node &> /dev/null; then
      if node -c "$file" 2>/dev/null; then
        echo "    ✓ Syntax valid"
      else
        echo "    ✗ Syntax error detected"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  else
    echo "  ✗ Missing $file"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# Check locale files
echo "→ Checking locale files..."
LOCALES=("en" "de" "fr" "es" "it" "nl")

for locale in "${LOCALES[@]}"; do
  LOCALE_FILE="_locales/${locale}/messages.json"
  if [ -f "$LOCALE_FILE" ]; then
    echo "  ✓ $locale locale exists"
    
    if command -v jq &> /dev/null; then
      if jq empty "$LOCALE_FILE" 2>/dev/null; then
        # Count message keys
        KEY_COUNT=$(jq 'keys | length' "$LOCALE_FILE")
        echo "    ✓ Valid JSON ($KEY_COUNT keys)"
      else
        echo "    ✗ Invalid JSON"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  else
    echo "  ⚠ Missing $locale locale"
    WARNINGS=$((WARNINGS + 1))
  fi
done

echo ""

# Check file sizes (warn if too large)
echo "→ Checking file sizes..."
TOTAL_SIZE=0

for file in manifest.json content.js storage-bridge.js options.js options.html; do
  if [ -f "$file" ]; then
    SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
    TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
    
    if [ $SIZE -gt 1048576 ]; then  # 1MB
      echo "  ⚠ $file is large: $(numfmt --to=iec $SIZE 2>/dev/null || echo "${SIZE} bytes")"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
done

TOTAL_SIZE_HR=$(numfmt --to=iec $TOTAL_SIZE 2>/dev/null || echo "${TOTAL_SIZE} bytes")
echo "  ℹ Total size (without icons): $TOTAL_SIZE_HR"

echo ""
echo "════════════════════════════════════════"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ Validation passed! No errors or warnings."
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  Validation passed with $WARNINGS warning(s)."
  exit 0
else
  echo "❌ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)."
  exit 1
fi