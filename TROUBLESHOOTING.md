# VaultPilot Troubleshooting Guide

## Common Issues and Solutions

### 400 Bad Request on Health Check

**Problem**: You're seeing `127.0.0.1:63893 - "OPTIONS /api/obsidian/health HTTP/1.1" 400 Bad Request` while WebSocket connections work fine.

**Root Cause**: This is typically a CORS (Cross-Origin Resource Sharing) issue where the browser is sending a preflight OPTIONS request that the server doesn't handle properly.

**Solutions Implemented**:

1. **Improved CORS Handling**: The plugin now includes proper CORS headers and mode settings
2. **Fallback Health Check**: If the main health check fails with a 400 error, the plugin automatically tries an alternative method using a HEAD request
3. **Better Error Handling**: Non-JSON responses are now handled gracefully
4. **Enhanced Logging**: Added debug logs to help diagnose connection issues

### How to Debug Connection Issues

1. **Check Browser Console**: Open the Developer Tools in Obsidian (Ctrl+Shift+I or Cmd+Option+I) and look for VaultPilot debug messages
2. **Monitor Network Requests**: In the Network tab, check if requests are being made and what responses are received
3. **Server Logs**: Check your EvoAgentX server logs to see what's happening on the backend

### Debug Logging

The plugin now includes detailed logging with the prefix "VaultPilot:" to help you track:
- Health check attempts and results
- WebSocket connection attempts
- API request failures
- Message parsing errors

### Server Configuration Recommendations

To fix the 400 error on your EvoAgentX server, ensure:

1. **CORS Headers**: Your server should include proper CORS headers:
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
   Access-Control-Allow-Headers: Content-Type, Authorization
   ```

2. **OPTIONS Request Handling**: Your server should respond to OPTIONS requests with a 200 status and appropriate headers

3. **Health Endpoint**: The `/api/obsidian/health` endpoint should:
   - Accept GET requests
   - Return JSON with `{"status": "ok", "version": "x.x.x"}`
   - Include proper CORS headers

### Testing the Fix

After updating the plugin:

1. Reload the plugin in Obsidian
2. Check the console for "VaultPilot:" prefixed messages
3. Try the "Test Connection" button in plugin settings
4. Monitor both the health check and WebSocket connections

### If Issues Persist

1. **Check Server Implementation**: Ensure your EvoAgentX server properly handles CORS
2. **Network Debugging**: Use tools like curl to test the health endpoint directly
3. **Logs Review**: Check both client-side (browser console) and server-side logs
4. **Port Configuration**: Verify the server is running on the expected port and accepting connections

### Example Curl Test

Test your health endpoint directly:
```bash
curl -X GET http://127.0.0.1:63893/api/obsidian/health \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -v
```

This should return a 200 status with JSON response, not a 400.
