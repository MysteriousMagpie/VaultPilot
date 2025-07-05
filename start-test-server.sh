#!/bin/bash

# VaultPilot Test Server Starter
# Starts the mock EvoAgentX server for testing VaultPilot

echo "🚀 Starting VaultPilot Test Server..."

# Navigate to the vaultpilot directory
cd "$(dirname "$0")/vaultpilot"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Start the test server
echo "🌐 Starting test server on http://localhost:3000"
echo "📡 Available endpoints:"
echo "  - GET  /api/obsidian/health       (VaultPilot health check)"
echo "  - POST /api/obsidian/chat         (Mock chat endpoint)"
echo "  - POST /api/obsidian/copilot/complete (Mock copilot endpoint)"
echo "  - POST /api/obsidian/workflow     (Mock workflow endpoint)"
echo "  - POST /planday                   (Plan My Day feature)"
echo ""
echo "💡 In Obsidian, set VaultPilot backend URL to: http://localhost:3000"
echo ""

node test-server.js
