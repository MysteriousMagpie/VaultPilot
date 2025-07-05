/**
 * Robust WebSocket Client for VaultPilot
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat/keep-alive mechanism
 * - Connection state management
 * - Error handling and logging
 */

class VaultPilotWebSocket {
    constructor(url, vaultId = 'default', options = {}) {
        this.url = url;
        this.vaultId = vaultId;
        this.options = {
            reconnectInterval: 1000,      // Initial reconnect delay (ms)
            maxReconnectInterval: 30000,  // Max reconnect delay (ms)
            reconnectDecay: 1.5,          // Exponential backoff multiplier
            maxReconnectAttempts: 10,     // Max reconnection attempts
            heartbeatInterval: 30000,     // Heartbeat interval (ms)
            heartbeatTimeout: 60000,      // Heartbeat timeout (ms)
            ...options
        };
        
        this.websocket = null;
        this.reconnectAttempts = 0;
        this.reconnectTimeoutId = null;
        this.heartbeatIntervalId = null;
        this.heartbeatTimeoutId = null;
        this.lastHeartbeat = null;
        this.connectionId = null;
        
        // Event handlers
        this.onOpen = null;
        this.onMessage = null;
        this.onClose = null;
        this.onError = null;
        this.onReconnecting = null;
        this.onReconnected = null;
        this.onHeartbeatTimeout = null;
        
        // Connection state
        this.isConnecting = false;
        this.isReconnecting = false;
        this.shouldReconnect = true;
        
        this.connect();
    }
    
    connect() {
        if (this.isConnecting) return;
        
        this.isConnecting = true;
        this.log('Connecting to WebSocket...', this.url);
        
        try {
            const wsUrl = `${this.url}/${this.vaultId}`;
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = this.handleOpen.bind(this);
            this.websocket.onmessage = this.handleMessage.bind(this);
            this.websocket.onclose = this.handleClose.bind(this);
            this.websocket.onerror = this.handleError.bind(this);
            
        } catch (error) {
            this.log('WebSocket connection failed:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }
    
    handleOpen(event) {
        this.log('WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Trigger onOpen callback
        if (this.onOpen) {
            this.onOpen(event);
        }
        
        // Trigger onReconnected if this was a reconnection
        if (this.isReconnecting && this.onReconnected) {
            this.onReconnected(event);
        }
    }
    
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            this.handleIncomingMessage(message);
            
            // Trigger onMessage callback
            if (this.onMessage) {
                this.onMessage(message, event);
            }
        } catch (error) {
            this.log('Failed to parse WebSocket message:', error, event.data);
        }
    }
    
    handleIncomingMessage(message) {
        const { type, data } = message;
        
        switch (type) {
            case 'connection':
                this.connectionId = data.connection_id;
                this.log('Connection established with ID:', this.connectionId);
                break;
                
            case 'heartbeat':
                // Respond to server heartbeat
                this.send({
                    type: 'heartbeat_response',
                    data: {
                        timestamp: new Date().toISOString(),
                        connection_id: data.connection_id
                    }
                });
                this.updateHeartbeat();
                break;
                
            case 'pong':
                // Handle pong response
                this.updateHeartbeat();
                break;
                
            case 'error':
                this.log('Server error:', data.message);
                break;
                
            default:
                // Let the application handle other message types
                break;
        }
    }
    
    handleClose(event) {
        this.log('WebSocket connection closed:', event.code, event.reason);
        this.isConnecting = false;
        this.stopHeartbeat();
        
        // Trigger onClose callback
        if (this.onClose) {
            this.onClose(event);
        }
        
        // Schedule reconnection if needed
        if (this.shouldReconnect && event.code !== 1000) {
            this.scheduleReconnect();
        }
    }
    
    handleError(event) {
        this.log('WebSocket error:', event);
        this.isConnecting = false;
        
        // Trigger onError callback
        if (this.onError) {
            this.onError(event);
        }
    }
    
    scheduleReconnect() {
        if (!this.shouldReconnect || this.reconnectAttempts >= this.options.maxReconnectAttempts) {
            this.log('Max reconnection attempts reached or reconnection disabled');
            return;
        }
        
        this.reconnectAttempts++;
        this.isReconnecting = true;
        
        // Calculate backoff delay
        const delay = Math.min(
            this.options.reconnectInterval * Math.pow(this.options.reconnectDecay, this.reconnectAttempts - 1),
            this.options.maxReconnectInterval
        );
        
        this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`);
        
        // Trigger onReconnecting callback
        if (this.onReconnecting) {
            this.onReconnecting(this.reconnectAttempts, delay);
        }
        
        // Clear any existing timeout
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
        }
        
        // Schedule reconnection
        this.reconnectTimeoutId = setTimeout(() => {
            this.reconnectTimeoutId = null;
            this.connect();
        }, delay);
    }
    
    startHeartbeat() {
        this.stopHeartbeat();
        this.updateHeartbeat();
        
        // Send periodic pings to server
        this.heartbeatIntervalId = setInterval(() => {
            if (this.isConnected()) {
                this.send({
                    type: 'ping',
                    data: { timestamp: new Date().toISOString() }
                });
            }
        }, this.options.heartbeatInterval);
        
        // Monitor heartbeat timeout
        this.checkHeartbeatTimeout();
    }
    
    stopHeartbeat() {
        if (this.heartbeatIntervalId) {
            clearInterval(this.heartbeatIntervalId);
            this.heartbeatIntervalId = null;
        }
        
        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId);
            this.heartbeatTimeoutId = null;
        }
    }
    
    updateHeartbeat() {
        this.lastHeartbeat = Date.now();
        this.checkHeartbeatTimeout();
    }
    
    checkHeartbeatTimeout() {
        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId);
        }
        
        this.heartbeatTimeoutId = setTimeout(() => {
            this.log('Heartbeat timeout - connection may be stale');
            
            // Trigger onHeartbeatTimeout callback
            if (this.onHeartbeatTimeout) {
                this.onHeartbeatTimeout();
            }
            
            // Force reconnection
            if (this.websocket) {
                this.websocket.close();
            }
        }, this.options.heartbeatTimeout);
    }
    
    send(message) {
        if (!this.isConnected()) {
            this.log('Cannot send message - WebSocket not connected:', message);
            return false;
        }
        
        try {
            const payload = typeof message === 'string' ? message : JSON.stringify(message);
            this.websocket.send(payload);
            return true;
        } catch (error) {
            this.log('Failed to send message:', error, message);
            return false;
        }
    }
    
    isConnected() {
        return this.websocket && this.websocket.readyState === WebSocket.OPEN;
    }
    
    isConnecting() {
        return this.websocket && this.websocket.readyState === WebSocket.CONNECTING;
    }
    
    getConnectionState() {
        if (!this.websocket) return 'DISCONNECTED';
        
        switch (this.websocket.readyState) {
            case WebSocket.CONNECTING: return 'CONNECTING';
            case WebSocket.OPEN: return 'CONNECTED';
            case WebSocket.CLOSING: return 'CLOSING';
            case WebSocket.CLOSED: return 'DISCONNECTED';
            default: return 'UNKNOWN';
        }
    }
    
    getStats() {
        return {
            connectionState: this.getConnectionState(),
            reconnectAttempts: this.reconnectAttempts,
            isReconnecting: this.isReconnecting,
            connectionId: this.connectionId,
            lastHeartbeat: this.lastHeartbeat ? new Date(this.lastHeartbeat).toISOString() : null,
            vaultId: this.vaultId
        };
    }
    
    disconnect() {
        this.shouldReconnect = false;
        this.stopHeartbeat();
        
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }
        
        if (this.websocket) {
            this.websocket.close(1000, 'Client disconnect');
            this.websocket = null;
        }
        
        this.log('WebSocket disconnected by client');
    }
    
    log(...args) {
        console.log('[VaultPilot WebSocket]', ...args);
    }
}

// Usage example
/*
const ws = new VaultPilotWebSocket('ws://localhost:8001/ws', 'my-vault', {
    reconnectInterval: 1000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000
});

ws.onOpen = (event) => {
    console.log('Connected to VaultPilot server');
};

ws.onMessage = (message, event) => {
    console.log('Received message:', message);
    
    // Handle different message types
    switch (message.type) {
        case 'chat':
            handleChatMessage(message.data);
            break;
        case 'workflow_progress':
            handleWorkflowProgress(message.data);
            break;
        case 'copilot':
            handleCopilotSuggestion(message.data);
            break;
    }
};

ws.onReconnecting = (attempt, delay) => {
    console.log(`Reconnecting... (attempt ${attempt}, delay ${delay}ms)`);
};

ws.onError = (event) => {
    console.error('WebSocket error:', event);
};

// Send a message
ws.send({
    type: 'vault_update',
    data: {
        files: ['note1.md', 'note2.md'],
        timestamp: new Date().toISOString()
    }
});

// Check connection status
console.log('Connection stats:', ws.getStats());

// Disconnect when done
// ws.disconnect();
*/

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VaultPilotWebSocket;
}

if (typeof window !== 'undefined') {
    window.VaultPilotWebSocket = VaultPilotWebSocket;
}
