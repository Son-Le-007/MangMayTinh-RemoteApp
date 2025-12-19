/**
 * Handles message processing and parsing
 */
class MessageHandler {
  constructor(registrationService, messageRouter, keepAliveHandler, logger) {
    this.registrationService = registrationService;
    this.messageRouter = messageRouter;
    this.keepAliveHandler = keepAliveHandler;
    this.logger = logger;
  }

  /**
   * Process an incoming message
   * @param {WebSocket} ws - WebSocket connection
   * @param {Buffer|String} msg - Raw message
   */
  handle(ws, msg) {
    // Convert message to string for checking
    const msgStr = msg.toString();

    // Handle ping/keepalive messages BEFORE trying to parse as JSON
    if (this.keepAliveHandler.handle(ws, msgStr)) {
      return;
    }

    // Try to parse as JSON for other messages
    let data;
    try {
      data = JSON.parse(msgStr);
    } catch {
      // Only log error if it's not a known non-JSON message
      if (msgStr !== 'ping' && msgStr !== 'pong') {
        this.logger.error(`Invalid JSON received: ${msgStr.substring(0, 100)}`);
      }
      return; // ignore non-JSON messages
    }

    // Handle registration
    if (this.registrationService.register(ws, data)) {
      return;
    }

    // --- ROUTING LOGIC ---
    this.messageRouter.route(ws, msg, data);
  }
}

module.exports = MessageHandler;

