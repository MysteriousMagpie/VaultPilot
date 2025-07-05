#!/usr/bin/env python3
"""
WebSocket Connection Test Script

This script tests the improved WebSocket implementation to verify:
- Connection stability
- Heartbeat mechanism
- Reconnection logic
- Error handling
"""

import asyncio
import websockets
import json
import time
from datetime import datetime

async def test_websocket_connection():
    """Test WebSocket connection with heartbeat and reconnection"""
    
    uri = "ws://localhost:8001/ws/test-vault"
    reconnect_attempts = 0
    max_attempts = 5
    
    while reconnect_attempts < max_attempts:
        try:
            print(f"🔌 Attempting to connect to {uri} (attempt {reconnect_attempts + 1})")
            
            async with websockets.connect(uri) as websocket:
                print("✅ Connected successfully!")
                reconnect_attempts = 0  # Reset on successful connection
                
                # Send initial message
                await websocket.send(json.dumps({
                    "type": "request_status",
                    "data": {}
                }))
                
                # Listen for messages and handle heartbeats
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        message_type = data.get("type", "unknown")
                        timestamp = data.get("timestamp", "")
                        
                        print(f"📨 Received [{message_type}] at {timestamp}")
                        
                        if message_type == "heartbeat":
                            # Respond to server heartbeat
                            response = {
                                "type": "heartbeat_response",
                                "data": {
                                    "timestamp": datetime.now().isoformat(),
                                    "connection_id": data.get("data", {}).get("connection_id")
                                }
                            }
                            await websocket.send(json.dumps(response))
                            print("💓 Sent heartbeat response")
                            
                        elif message_type == "connection":
                            print(f"🎯 Connection established with ID: {data.get('data', {}).get('connection_id')}")
                            
                        elif message_type == "status":
                            print(f"📊 Status: {data.get('data', {})}")
                            
                        elif message_type == "error":
                            print(f"❌ Server error: {data.get('data', {}).get('message')}")
                            
                        # Send periodic test messages
                        if int(time.time()) % 45 == 0:  # Every 45 seconds
                            test_message = {
                                "type": "vault_update",
                                "data": {
                                    "files": ["test.md"],
                                    "timestamp": datetime.now().isoformat()
                                }
                            }
                            await websocket.send(json.dumps(test_message))
                            print("📤 Sent test vault update")
                            
                    except json.JSONDecodeError as e:
                        print(f"⚠️ Failed to parse message: {e}")
                    except Exception as e:
                        print(f"⚠️ Error handling message: {e}")
                        
        except websockets.exceptions.ConnectionClosed as e:
            print(f"🔌 Connection closed: {e}")
            reconnect_attempts += 1
            
        except websockets.exceptions.InvalidURI as e:
            print(f"❌ Invalid URI: {e}")
            break
            
        except ConnectionRefusedError:
            print("❌ Connection refused - is the server running?")
            print("   Start the server with: python server.py")
            break
            
        except Exception as e:
            print(f"⚠️ Unexpected error: {e}")
            reconnect_attempts += 1
            
        # Wait before reconnecting
        if reconnect_attempts < max_attempts:
            wait_time = min(2 ** reconnect_attempts, 30)  # Exponential backoff
            print(f"⏳ Waiting {wait_time}s before reconnecting...")
            await asyncio.sleep(wait_time)
    
    print(f"❌ Max reconnection attempts ({max_attempts}) reached. Giving up.")

async def test_multiple_connections():
    """Test multiple concurrent connections"""
    print("🔗 Testing multiple concurrent connections...")
    
    tasks = []
    for i in range(3):
        vault_id = f"test-vault-{i}"
        task = asyncio.create_task(test_single_connection(vault_id, duration=30))
        tasks.append(task)
    
    await asyncio.gather(*tasks, return_exceptions=True)

async def test_single_connection(vault_id, duration=60):
    """Test a single connection for a specified duration"""
    uri = f"ws://localhost:8001/ws/{vault_id}"
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f"✅ [{vault_id}] Connected")
            
            start_time = time.time()
            while time.time() - start_time < duration:
                try:
                    # Wait for messages with timeout
                    message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    data = json.loads(message)
                    print(f"📨 [{vault_id}] {data.get('type', 'unknown')}")
                    
                    # Respond to heartbeats
                    if data.get("type") == "heartbeat":
                        await websocket.send(json.dumps({
                            "type": "heartbeat_response",
                            "data": {"timestamp": datetime.now().isoformat()}
                        }))
                        
                except asyncio.TimeoutError:
                    # Send ping if no messages received
                    await websocket.send(json.dumps({
                        "type": "ping",
                        "data": {"timestamp": datetime.now().isoformat()}
                    }))
                    print(f"🏓 [{vault_id}] Sent ping")
                    
    except Exception as e:
        print(f"❌ [{vault_id}] Error: {e}")

if __name__ == "__main__":
    print("🚀 VaultPilot WebSocket Test Script")
    print("=" * 50)
    
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "multiple":
        print("Testing multiple connections...")
        asyncio.run(test_multiple_connections())
    else:
        print("Testing single connection...")
        print("Use 'python test_websocket.py multiple' to test multiple connections")
        asyncio.run(test_websocket_connection())
