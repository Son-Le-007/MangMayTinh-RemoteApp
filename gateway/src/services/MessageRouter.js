/**
 * Handles message routing between web client and agent
 */
class MessageRouter {
  constructor(connectionManager, logger) {
    this.connectionManager = connectionManager;
    this.logger = logger;
  }

  /**
   * Route a message from one client to another
   * @param {WebSocket} ws - Source WebSocket connection
   * @param {Buffer|String} msg - Message to route
   * @param {Object|null} data - Parsed JSON data (if available)
   */
  route(ws, msg, data) {
    const webClient = this.connectionManager.getWebClient();
    const agentClient = this.connectionManager.getAgentClient();

    // Route from web to agent
    if (ws === webClient && agentClient) {
      // Convert message to string to ensure it's sent as text, not binary
      agentClient.send(msg.toString());
      // Log full JSON request content from web to agent
      this.logger.routing('web -> agent: Full JSON request:');
      return;
    }

    // Route from agent to web
    if (ws === agentClient && webClient) {
      // Log image length for screenshot responses (after receiving from agent, before sending to web)
      if (data && data.imageData) {
        this.logger.screenshot(`Image length after receiving from agent and before sending to web: ${data.imageData.length} bytes (base64)`);
      }
      // Convert message to string to ensure it's sent as text, not binary
      webClient.send(msg.toString());
      // Log full JSON response content from agent to web
      this.logger.routing('agent -> web: Full JSON response:');
      return;
    }

    // Message cannot be routed - handle error cases
    if (ws === webClient && !agentClient) {
      this.logger.warning('Web client sent message but agent not connected');
    } else if (ws === agentClient && !webClient) {
      this.logger.warning('Agent sent message but web client not connected');
    } else if (!ws.role) {
      this.logger.error('Unregistered client attempted to send message');
    }
  }
}

module.exports = MessageRouter;

