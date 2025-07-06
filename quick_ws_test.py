#!/usr/bin/env python3
"""
Quick WebSocket test for VaultPilot backend endpoint
"""

import asyncio
import websockets
import json

async def test_enhanced_endpoint():
    """Test the specific endpoint VaultPilot is trying to connect to"""
    url = "ws://localhost:8000/api/obsidian/ws/enhanced"
    
    print(f"🔌 Testing: {url}")
    
    try:
        async with websockets.connect(url) as websocket:
            print("✅ Connection successful!")
            
            # Wait for any welcome message
            try:
                msg = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                print(f"📨 Received: {msg}")
            except asyncio.TimeoutError:
                print("⏰ No immediate message")
            
            # Send test message
            await websocket.send('{"type": "test", "data": "hello"}')
            
            # Get response
            response = await asyncio.wait_for(websocket.recv(), timeout=3.0)
            print(f"📥 Response: {response}")
            
    except Exception as e:
        print(f"❌ Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_enhanced_endpoint())
