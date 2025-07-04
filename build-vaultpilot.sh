#!/bin/bash
# Script to build the VaultPilot plugin from the correct directory

set -e

cd "$(dirname "$0")/vaultpilot"
echo "Running npm run build in $(pwd)"
npm run build
