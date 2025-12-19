/**
 * Manages WebSocket client connections
 * Encapsulates webClient and agentClient state
 */
const WebSocket = require('ws');

class ConnectionManager {
  constructor() {
    this.webClient = null;
    this.agentClient = null;
  }

  /**
   * Register a client with a specific role
   * @param {string} role - 'web' or 'agent'
   * @param {WebSocket} ws - WebSocket connection
   * @returns {boolean} - true if replaced existing connection, false otherwise
   */
  registerClient(role, ws) {
    let replaced = false;
    
    if (role === 'web') {
      if (this.webClient) {
        replaced = true;
      }
      this.webClient = ws;
    } else if (role === 'agent') {
      if (this.agentClient) {
        replaced = true;
      }
      this.agentClient = ws;
    }
    
    return replaced;
  }

  /**
   * Get client by role
   * @param {string} role - 'web' or 'agent'
   * @returns {WebSocket|null}
   */
  getClient(role) {
    if (role === 'web') {
      return this.webClient;
    } else if (role === 'agent') {
      return this.agentClient;
    }
    return null;
  }

  /**
   * Remove client by WebSocket reference
   * @param {WebSocket} ws - WebSocket connection to remove
   */
  removeClient(ws) {
    if (ws === this.webClient) {
      this.webClient = null;
    }
    if (ws === this.agentClient) {
      this.agentClient = null;
    }
  }

  /**
   * Check if a client is connected by role
   * @param {string} role - 'web' or 'agent'
   * @returns {boolean}
   */
  isClientConnected(role) {
    const client = this.getClient(role);
    return client !== null && client.readyState === WebSocket.OPEN;
  }

  /**
   * Get web client (for reference equality checks)
   * @returns {WebSocket|null}
   */
  getWebClient() {
    return this.webClient;
  }

  /**
   * Get agent client (for reference equality checks)
   * @returns {WebSocket|null}
   */
  getAgentClient() {
    return this.agentClient;
  }
}

module.exports = ConnectionManager;

