#!/bin/bash
# start-all-agents.sh — Start core EVOX agents (no tmux required)
# Usage: ./scripts/start-all-agents.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "╔════════════════════════════════════════════════╗"
echo "║  EVOX — Automation Squad (4 Agents)            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "North Star: 100% AUTOMATION"
echo ""

# Create logs dir
mkdir -p logs

# Kill existing agent processes
echo "Cleaning up..."
pkill -f "agent-loop.sh" 2>/dev/null || true
rm -f .lock-* 2>/dev/null || true
sleep 1

echo "Starting agents in background..."
echo ""

# Start agents in background with nohup
nohup ./scripts/agent-loop.sh sam > logs/sam.log 2>&1 &
echo "  ✅ SAM  — Backend (PID: $!)"

nohup ./scripts/agent-loop.sh leo > logs/leo.log 2>&1 &
echo "  ✅ LEO  — Frontend (PID: $!)"

nohup ./scripts/agent-loop.sh max > logs/max.log 2>&1 &
echo "  ✅ MAX  — PM (PID: $!)"

nohup ./scripts/agent-loop.sh quinn > logs/quinn.log 2>&1 &
echo "  ✅ QUINN — QA (PID: $!)"

sleep 2

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  4 agents running in background                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "View logs:"
echo "  tail -f logs/sam.log"
echo "  tail -f logs/leo.log"
echo "  tail -f logs/max.log"
echo "  tail -f logs/quinn.log"
echo ""
echo "Stop all:"
echo "  ./scripts/stop-all-agents.sh"
echo ""
