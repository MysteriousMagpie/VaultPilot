"""
EvoAgentX Server Integration Example

Add this code to your existing EvoAgentX FastAPI server to enable VaultPilot support.
"""

# 1. Add these imports to your EvoAgentX server
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import the VaultPilot routes (copy the evoagentx_integration folder to your server first)
from obsidian_routes import obsidian_router
from websocket_handler import websocket_manager

# 2. In your FastAPI app setup, add:

app = FastAPI(title="EvoAgentX with VaultPilot Support")

# Enable CORS for Obsidian
app.add_middleware(
    CORSMiddleware,
    allow_origins=["app://obsidian.md", "https://obsidian.md", "*"],  # Add your domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include VaultPilot routes
app.include_router(obsidian_router, prefix="/api/obsidian")

# Add WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket):
    await websocket_manager.connect(websocket)
    # Your WebSocket logic here

# 3. Your existing EvoAgentX routes and logic remain unchanged
# @app.post("/your-existing-routes")
# async def your_functions():
#     pass

# 4. Start your server as usual
# uvicorn your_server:app --host 0.0.0.0 --port YOUR_PORT

print("""
🔗 VaultPilot Integration Added to EvoAgentX!

Available endpoints:
- POST /api/obsidian/chat
- POST /api/obsidian/vault/analyze  
- POST /api/obsidian/workflow
- GET  /api/obsidian/status
- WS   /ws

Configure VaultPilot to use: http://your-evoagentx-server:port
""")
