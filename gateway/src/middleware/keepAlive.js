/**
 * Handles ping/pong keepalive messages
 */
const WebSocket = require('ws');

class KeepAliveHandler {
  /**
   * Handle ping/pong messages
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} msgStr - Message as string
   * @returns {boolean} - true if handled (ping/pong), false otherwise
   */
  static handle(ws, msgStr) {
    // Handle ping/keepalive messages BEFORE trying to parse as JSON
    if (msgStr === 'ping' || msgStr === 'pong') {
      // Echo back pong to keep connection alive (for ping)
      // Ignore pong messages (they're responses to our pings)
      if (msgStr === 'ping' && ws.readyState === WebSocket.OPEN) {
        ws.send('pong');
      }
      return true;
    }
    return false;
  }
}

module.exports = KeepAliveHandler;

