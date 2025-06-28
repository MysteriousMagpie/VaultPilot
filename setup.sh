#!/bin/bash

# VaultPilot Setup Script
# Automates the setup and build process for VaultPilot Obsidian plugin

set -e

echo "🚀 VaultPilot Setup Script"
echo "=========================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are available"

# Navigate to plugin directory
cd "$(dirname "$0")/vaultpilot"

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building plugin..."
npm run build

echo "📋 Build summary:"
echo "   - Source files compiled"
echo "   - Output: dist/main.js"
echo "   - Plugin ready for installation"

echo ""
echo "🎯 Next steps:"
echo "1. Copy the plugin to your Obsidian plugins folder:"
echo "   - Windows: %APPDATA%\\Obsidian\\plugins\\vaultpilot\\"
echo "   - macOS: ~/Library/Application Support/obsidian/plugins/vaultpilot/"
echo "   - Linux: ~/.config/obsidian/plugins/vaultpilot/"
echo ""
echo "2. Copy these files to the plugin folder:"
echo "   - dist/main.js"
echo "   - manifest.json"
echo ""
echo "3. Enable the plugin in Obsidian settings"
echo "4. Configure backend URL in VaultPilot settings"
echo ""
echo "✨ VaultPilot setup complete!"
