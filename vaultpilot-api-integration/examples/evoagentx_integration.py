"""
Example: Using VaultPilot API Integration with existing server

This example shows how to integrate the VaultPilot API package 
with your existing FastAPI backend.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import the VaultPilot integration
from vaultpilot_api_integration.python.fastapi_adapter import setup_vaultpilot_api

def create_app():
    """Create FastAPI app with VaultPilot integration"""
    
    # Create main app
    app = FastAPI(
        title="EvoAgentX with VaultPilot Integration",
        description="AI backend with VaultPilot API support",
        version="1.0.0"
    )
    
    # Setup CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add VaultPilot API endpoints
    vaultpilot_adapter = setup_vaultpilot_api(app)
    
    # Add your existing routes here
    @app.get("/")
    async def root():
        return {
            "message": "EvoAgentX Backend with VaultPilot Integration",
            "vaultpilot_api": "enabled",
            "version": "1.0.0"
        }
    
    # Your existing EvoAgentX routes can be added here
    # @app.include_router(your_existing_router)
    
    return app

if __name__ == "__main__":
    app = create_app()
    
    print("🚀 Starting EvoAgentX with VaultPilot Integration...")
    print("📡 VaultPilot API endpoints available at:")
    print("   - GET  /health")
    print("   - GET  /api/status") 
    print("   - POST /api/vault/analyze")
    print("   - POST /api/chat")
    print("   - GET  /api/workflows/templates")
    print("   - POST /api/workflows")
    print("   - GET  /api/analytics/dashboard")
    print("   - WS   /ws")
    print("")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8002,
        reload=True
    )
