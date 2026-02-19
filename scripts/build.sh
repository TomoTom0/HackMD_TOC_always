#!/bin/bash
# Build script for HackMD TOC always extension

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building HackMD TOC always extension...${NC}"

# Create dist directory
rm -rf dist
mkdir -p dist

# Copy manifest.json
echo "Copying manifest.json..."
cp src/manifest.json dist/

# Copy content scripts
echo "Copying content scripts..."
cp src/content_script.js dist/

# Copy options page
echo "Copying options page..."
cp src/options.html dist/
cp src/options_script.js dist/

# Copy images
echo "Copying images..."
mkdir -p dist/img
cp src/img/*.png dist/img/ 2>/dev/null || echo "  No PNG files found in src/img/"

# Create source map for debugging (optional)
# echo "Creating source maps..."

echo -e "${GREEN}Build complete!${NC}"
echo -e "${YELLOW}Load 'dist' directory in Chrome extensions (chrome://extensions)${NC}"

# List contents
echo ""
echo "Built files:"
ls -la dist/
