/**
 * Handles WebSocket connection lifecycle
 */
class WebSocketHandler {
  constructor(connectionManager, messageHandler, logger) {
    this.connectionManager = connectionManager;
    this.messageHandler = messageHandler;
    this.logger = logger;
  }

  /**
   * Setup event handlers for a new WebSocket connection
   * @param {WebSocket} ws - WebSocket connection
   */
  setup(ws) {
    this.logger.info('A client connected. Waiting for register...');

    ws.role = null;

    // Handle incoming messages
    ws.on('message', (msg) => {
      this.messageHandler.handle(ws, msg);
    });

    // Handle errors
    ws.on('error', (error) => {
      this.logger.error(`WebSocket error: ${error.message}`);
    });

    // Handle connection close
    ws.on('close', () => {
      this.logger.info(`${ws.role || 'Unregistered client'} disconnected`);
      this.connectionManager.removeClient(ws);
    });
  }
}

module.exports = WebSocketHandler;

