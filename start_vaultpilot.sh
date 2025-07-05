#!/bin/bash

# VaultPilot Server Startup Script
# Simple script to start the VaultPilot server

echo "🚀 Starting VaultPilot Server..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run setup.sh first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Kill any existing servers on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Start the server
echo "📡 Starting server on http://localhost:8000"
python vaultpilot_server.py
