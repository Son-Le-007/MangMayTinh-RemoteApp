const WebSocket = require('ws');


// Khởi tạo WebSocket server
const wss = new WebSocket.Server({ port: 8080, maxPayload: 50 * 1024 *1024 }, () => {
  console.log('WebSocket server running on ws://localhost:8080');
});

// Biến giữ client
let webClient = null;
let agentClient = null;

wss.on("connection", (ws) => {
  console.log("[INFO] A client connected. Waiting for register...");

  ws.role = null;

  ws.on("message", (msg) => {
    // Convert message to string for checking
    const msgStr = msg.toString().trim();
    
    // Handle ping/keepalive messages BEFORE trying to parse as JSON
    if (msgStr === 'ping' || msgStr === 'pong') {
      // Echo back pong to keep connection alive (for ping)
      // Ignore pong messages (they're responses to our pings)
      if (msgStr === 'ping' && ws.readyState === WebSocket.OPEN) {
        ws.send('pong');
      }
      return;
    }

    // Try to parse as JSON for other messages
    let data;
    try {
      data = JSON.parse(msgStr);
    } catch (err) {
      // Only log error if it's not a known non-JSON message
      if (msgStr !== 'ping' && msgStr !== 'pong') {
        console.error("[ERROR] Invalid JSON received:", msgStr.substring(0, 100));
      }
      return; // ignore non-JSON messages
    }

    // Handle registration
    if (data.type === "register") {
      ws.role = data.role;

      if (ws.role === "web") {
        if (webClient) {
          console.log("[WARNING] New web client connected, replacing existing connection");
        }
        webClient = ws;
        console.log("[SUCCESS] Web client registered successfully");
      } else if (ws.role === "agent") {
        if (agentClient) {
          console.log("[WARNING] New agent connected, replacing existing connection");
        }
        agentClient = ws;
        console.log("[SUCCESS] Agent registered successfully");
      } else {
        console.error("[ERROR] Unknown role attempted to register:", ws.role);
        ws.close();
      }
      return;
    }

    // --- ROUTING LOGIC ---
    if (ws === webClient && agentClient) {
      // Convert message to string to ensure it's sent as text, not binary
      // Use toString() to preserve original format (msgStr is trimmed)
      agentClient.send(msg.toString());
      // Log full JSON request content from web to agent
      console.log(`[ROUTING] web -> agent: Full JSON request:`);
      console.log(JSON.stringify(data, null, 2));
    } else if (ws === agentClient && webClient) {
      // Convert message to string to ensure it's sent as text, not binary
      // Use toString() to preserve original format (msgStr is trimmed)
      webClient.send(msg.toString());
      // Log full JSON response content from agent to web
      console.log(`[ROUTING] agent -> web: Full JSON response:`);
      console.log(JSON.stringify(data, null, 2));
    } else {
      // Message cannot be routed
      if (ws === webClient && !agentClient) {
        console.log("[WARNING] Web client sent message but agent not connected");
      } else if (ws === agentClient && !webClient) {
        console.log("[WARNING] Agent sent message but web client not connected");
      } else if (!ws.role) {
        console.error("[ERROR] Unregistered client attempted to send message");
      }
    }
  });

  ws.on('error', (error) => {
    console.error("[ERROR] WebSocket error:", error.message);
  });

  ws.on('close', () => {
    console.log(`[INFO] ${ws.role || 'Unregistered client'} disconnected`);
    if (ws.role === 'web') webClient = null;
    if (ws.role === 'agent') agentClient = null;
  });
});