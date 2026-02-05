#!/bin/bash
# Post-Commit Rollback Hook — AGT-277
# Automatically reverts commits that break the build
#
# Install: ./scripts/install-git-hooks.sh
#
# Flow:
# 1. Run `npx next build` after commit
# 2. If build fails → revert commit
# 3. Log incident to Convex
# 4. Notify #dev channel

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONVEX_URL="https://gregarious-elk-556.convex.site"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current commit info
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_SHORT=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
COMMIT_AUTHOR=$(git log -1 --pretty=%an)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Skip if in the middle of a revert
if [[ "$COMMIT_MSG" == Revert* ]]; then
  echo -e "${YELLOW}[post-commit] Skipping build check for revert commit${NC}"
  exit 0
fi

# Skip if on main/production branch (should use CI/CD)
if [[ "$BRANCH" == "main" ]] || [[ "$BRANCH" == "master" ]]; then
  echo -e "${YELLOW}[post-commit] Skipping local build check on protected branch. Use CI/CD.${NC}"
  exit 0
fi

echo -e "${GREEN}[post-commit] Verifying build for commit ${COMMIT_SHORT}...${NC}"

# Run build
cd "$PROJECT_ROOT"
BUILD_OUTPUT=$(npx next build 2>&1) || BUILD_EXIT_CODE=$?

if [ -n "$BUILD_EXIT_CODE" ] && [ "$BUILD_EXIT_CODE" -ne 0 ]; then
  echo -e "${RED}[post-commit] Build FAILED! Reverting commit ${COMMIT_SHORT}...${NC}"

  # Revert the commit
  git revert HEAD --no-edit
  REVERT_HASH=$(git rev-parse --short HEAD)

  echo -e "${YELLOW}[post-commit] Created revert commit ${REVERT_HASH}${NC}"

  # Extract error from build output (last 50 lines)
  ERROR_SUMMARY=$(echo "$BUILD_OUTPUT" | tail -50 | head -20)

  # Log incident to Convex executionLogs
  TIMESTAMP=$(date +%s%3N)
  INCIDENT_DATA=$(cat <<EOF
{
  "agentName": "$COMMIT_AUTHOR",
  "level": "error",
  "message": "Build failed after commit ${COMMIT_SHORT}. Auto-reverted to ${REVERT_HASH}.",
  "metadata": {
    "originalCommit": "$COMMIT_HASH",
    "revertCommit": "$(git rev-parse HEAD)",
    "commitMessage": "$COMMIT_MSG",
    "branch": "$BRANCH",
    "buildError": "$ERROR_SUMMARY"
  },
  "timestamp": $TIMESTAMP
}
EOF
)

  # Post to Convex (fire and forget, don't block)
  curl -s -X POST "$CONVEX_URL/logIncident" \
    -H "Content-Type: application/json" \
    -d "$INCIDENT_DATA" > /dev/null 2>&1 || true

  # Notify #dev channel
  NOTIFICATION_MSG="[AUTO-ROLLBACK] Commit ${COMMIT_SHORT} by ${COMMIT_AUTHOR} broke the build. Auto-reverted. Error: ${ERROR_SUMMARY:0:200}..."

  curl -s -X POST "$CONVEX_URL/postToChannel" \
    -H "Content-Type: application/json" \
    -d "{\"channel\": \"dev\", \"from\": \"SYSTEM\", \"message\": \"$NOTIFICATION_MSG\"}" > /dev/null 2>&1 || true

  echo -e "${RED}======================================${NC}"
  echo -e "${RED}BUILD FAILED - COMMIT REVERTED${NC}"
  echo -e "${RED}======================================${NC}"
  echo -e "${YELLOW}Original commit: ${COMMIT_SHORT}${NC}"
  echo -e "${YELLOW}Revert commit: ${REVERT_HASH}${NC}"
  echo -e "${YELLOW}Please fix the build and commit again.${NC}"
  echo ""
  echo "Build error preview:"
  echo "$ERROR_SUMMARY"

  exit 1
else
  echo -e "${GREEN}[post-commit] Build passed for ${COMMIT_SHORT}${NC}"
fi
