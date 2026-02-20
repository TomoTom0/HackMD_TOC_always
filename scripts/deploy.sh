#!/bin/bash
# Deploy script for HackMD TOC always extension

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load .env file if exists
if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi

# Default values
DIST_DIR=${DIST_DIR:-dist}
DEPLOY_TARGET=${DEPLOY_TARGET:-}

# Check if deploy target is set
if [ -z "$DEPLOY_TARGET" ]; then
    echo -e "${RED}Error: DEPLOY_TARGET is not set${NC}"
    echo "Please set DEPLOY_TARGET in .env file or environment variable"
    echo "Example: DEPLOY_TARGET=user@host:/path/to/destination"
    exit 1
fi

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${YELLOW}Warning: $DIST_DIR directory not found${NC}"
    echo "Running build first..."
    ./scripts/build.sh
fi

echo -e "${GREEN}Deploying to $DEPLOY_TARGET...${NC}"

# Deploy using rsync
rsync -avz --delete \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='tmp/' \
    "$DIST_DIR/" "$DEPLOY_TARGET/"

echo -e "${GREEN}Deploy complete!${NC}"
