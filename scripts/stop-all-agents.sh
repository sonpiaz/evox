#!/bin/bash
# stop-all-agents.sh — Stop all EVOX agents
# Usage: ./scripts/stop-all-agents.sh

echo "Stopping all agents..."

# Kill agent processes
pkill -f "agent-loop.sh" 2>/dev/null || true

# Remove lock files
rm -f /Users/sonpiaz/evox/.lock-* 2>/dev/null || true

# Kill tmux session
tmux kill-session -t evox-agents 2>/dev/null || true

echo "✅ All agents stopped"
