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

# Copy static files from public/
echo "Copying static files from public/..."
cp public/manifest.json dist/
cp public/options.html dist/

# Copy images
echo "Copying images..."
mkdir -p dist/img
cp public/img/*.png dist/img/ 2>/dev/null || echo "  No PNG files found in public/img/"

# Copy source scripts
echo "Copying source scripts..."
cp src/content_script.js dist/
cp src/options_script.js dist/

echo -e "${GREEN}Build complete!${NC}"
echo -e "${YELLOW}Load 'dist' directory in Chrome extensions (chrome://extensions)${NC}"

# List contents
echo ""
echo "Built files:"
ls -la dist/
