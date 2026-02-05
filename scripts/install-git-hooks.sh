#!/bin/bash
# Install Git Hooks — AGT-277
# Sets up post-commit hook for build verification and auto-rollback
#
# Usage: ./scripts/install-git-hooks.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Installing git hooks..."

# Create post-commit hook
cat > "$HOOKS_DIR/post-commit" << 'HOOK_EOF'
#!/bin/bash
# Post-commit hook — AGT-277: Auto-rollback on build failure
# Installed by: scripts/install-git-hooks.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check if rollback script exists
if [ -f "$PROJECT_ROOT/scripts/post-commit-rollback.sh" ]; then
  exec "$PROJECT_ROOT/scripts/post-commit-rollback.sh"
else
  echo "[post-commit] Warning: post-commit-rollback.sh not found, skipping build check"
fi
HOOK_EOF

chmod +x "$HOOKS_DIR/post-commit"
chmod +x "$SCRIPT_DIR/post-commit-rollback.sh"

echo -e "${GREEN}Git hooks installed successfully!${NC}"
echo ""
echo "Installed hooks:"
echo "  - post-commit: Build verification + auto-rollback"
echo ""
echo -e "${YELLOW}To disable: rm .git/hooks/post-commit${NC}"
echo -e "${YELLOW}To skip once: git commit --no-verify${NC}"
