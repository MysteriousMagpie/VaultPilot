#!/usr/bin/env python3
"""
Quick test of the VaultPilot API Integration Package

This script demonstrates the new integration package working with a simple FastAPI server.
"""

import sys
import os
sys.path.append('/Users/malachiledbetter/Documents/GitHub/VaultPilot')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import the VaultPilot integration
sys.path.append('/Users/malachiledbetter/Documents/GitHub/VaultPilot/vaultpilot-api-integration')
from python.fastapi_adapter import setup_vaultpilot_api

def create_vaultpilot_server():
    """Create a complete VaultPilot-compatible server"""
    
    app = FastAPI(
        title="VaultPilot Integration Demo",
        description="Complete VaultPilot API implementation",
        version="1.0.0"
    )
    
    # Setup CORS for VaultPilot frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add all VaultPilot endpoints
    vaultpilot = setup_vaultpilot_api(app)
    
    return app, vaultpilot

if __name__ == "__main__":
    app, vaultpilot = create_vaultpilot_server()
    
    print("🚀 VaultPilot Integration Server Starting...")
    print("📋 Available Endpoints:")
    print("   ✅ GET  /health")
    print("   ✅ GET  /api/status")
    print("   ✅ POST /api/vault/analyze")
    print("   ✅ GET  /api/vault/analysis/{id}")
    print("   ✅ POST /api/vault/summary")
    print("   ✅ POST /api/chat")
    print("   ✅ GET  /api/workflows/templates")
    print("   ✅ POST /api/workflows")
    print("   ✅ GET  /api/workflows/{id}")
    print("   ✅ GET  /api/analytics/dashboard")
    print("   ✅ GET  /api/agents/status")
    print("   ✅ WS   /ws")
    print("")
    print("🔧 Configure VaultPilot to use: http://localhost:8002")
    print("")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8002,
        reload=False
    )
