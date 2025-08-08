#!/usr/bin/env python3
"""
VaultPilot EvoAgentX Integration Server

Main server application that combines the Node.js test server with
Python backend AI processing capabilities.
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import os
import sys

# Add the current directory to Python path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from evoagentx_integration import (
    obsidian_router,
    setup_cors,
    websocket_manager,
    VaultAnalyzer,
    CopilotEngine,
    WorkflowProcessor,
    AgentManager
)
from fastapi import WebSocket, WebSocketDisconnect, Response

# Create FastAPI app
app = FastAPI(
    title="VaultPilot EvoAgentX Integration",
    description="AI-powered backend for VaultPilot Obsidian plugin",
    version="2.0.0"
)

# Setup CORS
setup_cors(app)

# Include the Obsidian routes
app.include_router(obsidian_router, prefix="/api/obsidian")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, vault_id: str = "default"):
    """WebSocket endpoint for real-time communication with improved reliability"""
    from evoagentx_integration.websocket_handler import websocket_endpoint as ws_handler
    await ws_handler(websocket, vault_id)

@app.websocket("/ws/{vault_id}")
async def websocket_vault_endpoint(websocket: WebSocket, vault_id: str):
    """WebSocket endpoint for specific vault connections"""
    from evoagentx_integration.websocket_handler import websocket_endpoint as ws_handler
    await ws_handler(websocket, vault_id)

# Backward/forward compatible WebSocket route expected by some clients
@app.websocket("/ws/obsidian")
async def websocket_obsidian_endpoint(websocket: WebSocket):
    """Alias WebSocket endpoint used by older frontend clients"""
    from evoagentx_integration.websocket_handler import websocket_endpoint as ws_handler
    await ws_handler(websocket, "default")

# Canonical agent WebSocket endpoint
@app.websocket("/ws/agent")
async def websocket_agent_endpoint(websocket: WebSocket):
    from evoagentx_integration.websocket_handler import websocket_endpoint as ws_handler
    await ws_handler(websocket, "default")

# Initialize services
vault_analyzer = VaultAnalyzer()
copilot_engine = CopilotEngine()
workflow_processor = WorkflowProcessor()
agent_manager = AgentManager()

@app.get("/")
async def root():
    """Root endpoint with server info"""
    return {
        "message": "VaultPilot EvoAgentX Integration Server",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "status": "/status",
            "chat": "/api/obsidian/chat",
            "vault_analysis": "/api/obsidian/vault/analyze",
            "workflow": "/api/obsidian/workflow",
            "websocket": "/ws"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2025-07-03T22:30:00Z",
        "services": {
            "vault_analyzer": "operational",
            "copilot_engine": "operational", 
            "workflow_processor": "operational",
            "agent_manager": "operational"
        }
    }

# Add a standardized status endpoint used by some clients
@app.get("/status")
async def status_check():
    return {
        "status": "ok",
        "version": "2.0.0"
    }

@app.head("/status")
async def status_head():
    return Response(status_code=200)

@app.get("/api/obsidian/status")
async def get_status():
    """Get system status for VaultPilot dashboard"""
    return {
        "connection": "connected",
        "agents": {
            "active": 1,
            "total": 1
        },
        "last_analysis": "2025-07-03T22:30:00Z",
        "vault_stats": {
            "total_files": 367,
            "markdown_files": 320,
            "folders": 4
        }
    }

if __name__ == "__main__":
    print("🚀 Starting VaultPilot EvoAgentX Integration Server...")
    print("🔧 Backend: Python FastAPI with AI processing")
    print("🌐 Frontend: Node.js test server on port 3000")
    print("📡 API Server: http://localhost:8001")
    print("🔌 WebSocket: ws://localhost:8001/ws")
    print("")
    
    # Start the server
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
