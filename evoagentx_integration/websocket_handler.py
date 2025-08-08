"""
WebSocket Handler for VaultPilot Real-time Communication

This file manages WebSocket connections for real-time features like:
- Live chat updates
- Workflow progress notifications
- Copilot suggestions
- Vault synchronization events
"""

from typing import Dict, List, Set, Optional
import json
import asyncio
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections for VaultPilot clients
    
    Features:
    - Connection management per vault/user
    - Message broadcasting
    - Real-time event handling
    - Connection cleanup
    - Keep-alive heartbeat system
    """
    
    def __init__(self):
        # Store active connections by vault_id
        self.connections: Dict[str, Set] = {}
        # Store user sessions
        self.user_sessions: Dict[str, str] = {}
        # Store connection metadata for health tracking
        self.connection_metadata: Dict = {}
        # Heartbeat tracking
        self.heartbeat_interval = 30  # seconds
        self.heartbeat_timeout = 60   # seconds
        # Heartbeat task will be started when first connection is made
        self._heartbeat_task = None
        
    async def connect(self, websocket, vault_id: str = "default", user_id: Optional[str] = None):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        # Initialize vault connections if needed
        if vault_id not in self.connections:
            self.connections[vault_id] = set()
            
        # Add connection to vault group
        self.connections[vault_id].add(websocket)
        
        # Track connection metadata
        connection_id = id(websocket)
        self.connection_metadata[connection_id] = {
            "vault_id": vault_id,
            "user_id": user_id,
            "connected_at": datetime.now(),
            "last_ping": datetime.now(),
            "websocket": websocket
        }
        
        # Track user session if provided
        if user_id:
            self.user_sessions[user_id] = vault_id
            
        # Start heartbeat monitor if not already running
        if self._heartbeat_task is None or self._heartbeat_task.done():
            self._heartbeat_task = asyncio.create_task(self._heartbeat_monitor())
            
        logger.info(f"VaultPilot WebSocket connected: vault={vault_id}, user={user_id}, connection_id={connection_id}")
        
        # Send welcome message
        await self.send_to_connection(websocket, {
            "type": "connection",
            "data": {
                "status": "connected",
                "vault_id": vault_id,
                "connection_id": connection_id,
                "heartbeat_interval": self.heartbeat_interval,
                "timestamp": datetime.now().isoformat()
            }
        })
        
    async def disconnect(self, websocket, vault_id: str = "default", user_id: Optional[str] = None):
        """Handle WebSocket disconnection"""
        connection_id = id(websocket)
        
        # Remove from vault connections
        if vault_id in self.connections:
            self.connections[vault_id].discard(websocket)
            
            # Clean up empty vault groups
            if not self.connections[vault_id]:
                del self.connections[vault_id]
                
        # Clean up user session
        if user_id and user_id in self.user_sessions:
            del self.user_sessions[user_id]
            
        # Clean up connection metadata
        if connection_id in self.connection_metadata:
            del self.connection_metadata[connection_id]
            
        logger.info(f"VaultPilot WebSocket disconnected: vault={vault_id}, user={user_id}, connection_id={connection_id}")
        
    async def _heartbeat_monitor(self):
        """Background task to monitor connection health and send heartbeats"""
        while True:
            try:
                await asyncio.sleep(self.heartbeat_interval)
                current_time = datetime.now()
                dead_connections = []
                
                # Check all connections for heartbeat timeout
                for connection_id, metadata in self.connection_metadata.items():
                    websocket = metadata["websocket"]
                    last_ping = metadata["last_ping"]
                    
                    # Check if connection is stale
                    if current_time - last_ping > timedelta(seconds=self.heartbeat_timeout):
                        logger.warning(f"Connection {connection_id} heartbeat timeout")
                        dead_connections.append((websocket, metadata["vault_id"], metadata["user_id"]))
                        continue
                    
                    # Send heartbeat ping
                    try:
                        await self.send_to_connection(websocket, {
                            "type": "heartbeat",
                            "data": {
                                "timestamp": current_time.isoformat(),
                                "connection_id": connection_id
                            }
                        })
                    except Exception as e:
                        logger.error(f"Failed to send heartbeat to connection {connection_id}: {e}")
                        dead_connections.append((websocket, metadata["vault_id"], metadata["user_id"]))
                
                # Clean up dead connections
                for websocket, vault_id, user_id in dead_connections:
                    await self.disconnect(websocket, vault_id, user_id)
                    
            except Exception as e:
                logger.error(f"Error in heartbeat monitor: {e}")
                await asyncio.sleep(5)  # Wait before retrying
        
    async def send_to_connection(self, websocket, message: dict):
        """Send message to a specific connection"""
        try:
            formatted_message = {
                "type": message.get("type", "message"),
                "data": message.get("data", {}),
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(formatted_message))
            
            # Update last activity for heartbeat tracking
            connection_id = id(websocket)
            if connection_id in self.connection_metadata:
                self.connection_metadata[connection_id]["last_ping"] = datetime.now()
                
        except Exception as e:
            logger.error(f"Failed to send message to connection: {e}")
            # Remove failed connection
            connection_id = id(websocket)
            if connection_id in self.connection_metadata:
                metadata = self.connection_metadata[connection_id]
                await self.disconnect(websocket, metadata["vault_id"], metadata["user_id"])
            
    async def broadcast_to_vault(self, vault_id: str, message: dict):
        """Broadcast message to all connections in a vault"""
        if vault_id not in self.connections:
            return
            
        # Create list of connections to avoid modification during iteration
        connections = list(self.connections[vault_id])
        
        # Send to all connections
        for websocket in connections:
            try:
                await self.send_to_connection(websocket, message)
            except Exception as e:
                logger.error(f"Failed to send to connection, removing: {e}")
                # Remove failed connection
                self.connections[vault_id].discard(websocket)
                connection_id = id(websocket)
                if connection_id in self.connection_metadata:
                    metadata = self.connection_metadata[connection_id] 
                    await self.disconnect(websocket, vault_id, metadata.get("user_id"))
                
    async def broadcast_to_user(self, user_id: str, message: dict):
        """Send message to a specific user"""
        if user_id not in self.user_sessions:
            return
            
        vault_id = self.user_sessions[user_id]
        await self.broadcast_to_vault(vault_id, message)
        
    async def broadcast_to_all(self, message: dict):
        """Broadcast message to all connected clients"""
        for vault_id in list(self.connections.keys()):
            await self.broadcast_to_vault(vault_id, message)
            
    # Event-specific broadcasting methods
    
    async def send_chat_update(self, vault_id: str, chat_data: dict):
        """Send real-time chat update"""
        await self.broadcast_to_vault(vault_id, {
            "type": "chat",
            "data": chat_data
        })
        
    async def send_workflow_progress(self, vault_id: str, progress_data: dict):
        """Send workflow progress update"""
        await self.broadcast_to_vault(vault_id, {
            "type": "workflow_progress", 
            "data": progress_data
        })
        
    async def send_copilot_suggestion(self, vault_id: str, suggestion_data: dict):
        """Send copilot suggestion"""
        await self.broadcast_to_vault(vault_id, {
            "type": "copilot",
            "data": suggestion_data
        })
        
    async def send_vault_sync(self, vault_id: str, sync_data: dict):
        """Send vault synchronization update"""
        await self.broadcast_to_vault(vault_id, {
            "type": "vault_sync",
            "data": sync_data
        })
        
    async def send_intent_debug(self, vault_id: str, debug_data: dict):
        """Send intent classification debug info"""
        await self.broadcast_to_vault(vault_id, {
            "type": "intent_debug",
            "data": debug_data
        })
        
    async def send_error(self, vault_id: str, error_message: str):
        """Send error notification"""
        await self.broadcast_to_vault(vault_id, {
            "type": "error",
            "data": {
                "message": error_message,
                "timestamp": datetime.now().isoformat()
            }
        })
        
    def get_connection_count(self, vault_id: Optional[str] = None) -> int:
        """Get number of active connections"""
        if vault_id:
            return len(self.connections.get(vault_id, set()))
        else:
            return sum(len(connections) for connections in self.connections.values())
            
    def get_active_vaults(self) -> List[str]:
        """Get list of vaults with active connections"""
        return list(self.connections.keys())
    
    async def shutdown(self):
        """Shutdown the WebSocket manager and cleanup resources"""
        if self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
        logger.info("WebSocket manager shutdown complete")


# Global WebSocket manager instance
websocket_manager = WebSocketManager()


# FastAPI WebSocket route
async def websocket_endpoint(websocket, vault_id: str = "default"):
    """
    Main WebSocket endpoint for VaultPilot
    
    Add this to your FastAPI app:
    
    @app.websocket("/ws/obsidian")
    async def websocket_obsidian(websocket: WebSocket, vault_id: str = "default"):
        await websocket_endpoint(websocket, vault_id)
    """
    
    await websocket_manager.connect(websocket, vault_id)
    
    try:
        while True:
            # Listen for messages from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                await handle_client_message(websocket, vault_id, message)
            except json.JSONDecodeError:
                await websocket_manager.send_error(vault_id, "Invalid JSON message")
                
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket_manager.disconnect(websocket, vault_id)


async def handle_client_message(websocket, vault_id: str, message: dict):
    """
    Handle incoming messages from VaultPilot clients
    
    You can extend this to handle client-to-server communication.
    """
    message_type = message.get("type", "unknown")
    data = message.get("data", {})
    
    if message_type == "handshake":
        # Minimal handshake: acknowledge and return agent registry and capabilities
        try:
            from .agent_manager import AgentManager
        except Exception:
            AgentManager = None  # type: ignore
        agents = []
        if AgentManager is not None:
            try:
                manager = AgentManager()
                agents_list = await manager.get_all_agents()
                # Convert Pydantic/objects to dicts conservatively
                agents = [
                    {
                        "id": getattr(a, 'id', None),
                        "name": getattr(a, 'name', None),
                        "capabilities": getattr(a, 'capabilities', []),
                        "active": getattr(a, 'active', True)
                    }
                    for a in agents_list
                ]
            except Exception:
                agents = []

        await websocket_manager.send_to_connection(websocket, {
            "type": "handshake_ack",
            "data": {
                "accepted": True,
                "acceptedCapabilities": ["chat", "workflow", "copilot"],
                "agents": agents,
                "timestamp": datetime.now().isoformat()
            }
        })

    elif message_type == "ping":
        # Respond to ping with pong and update heartbeat
        connection_id = id(websocket)
        if connection_id in websocket_manager.connection_metadata:
            websocket_manager.connection_metadata[connection_id]["last_ping"] = datetime.now()
            
        await websocket_manager.send_to_connection(websocket, {
            "type": "pong",
            "data": {
                "timestamp": datetime.now().isoformat(),
                "connection_id": connection_id
            }
        })
        
    elif message_type == "pong":
        # Update heartbeat timestamp on pong response
        connection_id = id(websocket)
        if connection_id in websocket_manager.connection_metadata:
            websocket_manager.connection_metadata[connection_id]["last_ping"] = datetime.now()
        logger.debug(f"Received pong from connection {connection_id}")
        
    elif message_type == "heartbeat_response":
        # Handle client heartbeat responses
        connection_id = id(websocket)
        if connection_id in websocket_manager.connection_metadata:
            websocket_manager.connection_metadata[connection_id]["last_ping"] = datetime.now()
        logger.debug(f"Received heartbeat response from connection {connection_id}")
        
    elif message_type == "vault_update":
        # Handle vault content updates
        await websocket_manager.send_vault_sync(vault_id, {
            "action": "content_updated",
            "files": data.get("files", []),
            "timestamp": datetime.now().isoformat()
        })
        
    elif message_type == "request_status":
        # Send status information
        await websocket_manager.send_to_connection(websocket, {
            "type": "status",
            "data": {
                "vault_id": vault_id,
                "connections": websocket_manager.get_connection_count(vault_id),
                "timestamp": datetime.now().isoformat()
            }
        })
        
    else:
        logger.warning(f"Unknown message type: {message_type}")
        # Send error response for unknown message types
        await websocket_manager.send_to_connection(websocket, {
            "type": "error",
            "data": {
                "message": f"Unknown message type: {message_type}",
                "received_message": message
            }
        })


# Helper functions for integration with your AI systems

async def notify_workflow_started(vault_id: str, workflow_id: str, goal: str):
    """Notify clients that a workflow has started"""
    await websocket_manager.send_workflow_progress(vault_id, {
        "workflow_id": workflow_id,
        "step": "Starting workflow execution",
        "progress": 0.0,
        "status": "running",
        "goal": goal
    })


async def notify_workflow_step(vault_id: str, workflow_id: str, step: str, progress: float):
    """Notify clients of workflow progress"""
    await websocket_manager.send_workflow_progress(vault_id, {
        "workflow_id": workflow_id,
        "step": step,
        "progress": progress,
        "status": "running"
    })


async def notify_workflow_completed(vault_id: str, workflow_id: str, result: str):
    """Notify clients that a workflow completed"""
    await websocket_manager.send_workflow_progress(vault_id, {
        "workflow_id": workflow_id,
        "step": "Workflow completed successfully",
        "progress": 1.0,
        "status": "completed",
        "result": result
    })


async def notify_chat_response(vault_id: str, conversation_id: str, response: str, agent: str):
    """Notify clients of new chat responses"""
    await websocket_manager.send_chat_update(vault_id, {
        "conversation_id": conversation_id,
        "response": response,
        "agent": agent,
        "timestamp": datetime.now().isoformat()
    })


# Usage example for your AI processing:
"""
# In your chat processing:
async def process_chat(message, vault_id, conversation_id):
    # ... your chat logic ...
    
    # Notify clients of the response
    await notify_chat_response(vault_id, conversation_id, response, agent_name)
    
    return response

# In your workflow processing:
async def execute_workflow(goal, vault_id):
    workflow_id = str(uuid.uuid4())
    
    # Notify start
    await notify_workflow_started(vault_id, workflow_id, goal)
    
    # Process workflow with progress updates
    for step_num, step in enumerate(workflow_steps):
        progress = step_num / len(workflow_steps)
        await notify_workflow_step(vault_id, workflow_id, step, progress)
        
        # ... execute step ...
        
    # Notify completion
    await notify_workflow_completed(vault_id, workflow_id, final_result)
    
    return final_result
"""
