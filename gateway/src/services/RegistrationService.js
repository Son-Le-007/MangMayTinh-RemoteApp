/**
 * Handles client registration logic
 */
class RegistrationService {
  constructor(connectionManager, logger) {
    this.connectionManager = connectionManager;
    this.logger = logger;
  }

  /**
   * Register a client
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Registration data with type: "register" and role
   * @returns {boolean} - true if registration successful, false otherwise
   */
  register(ws, data) {
    if (data.type !== 'register') {
      return false;
    }

    ws.role = data.role;

    if (ws.role === 'web') {
      const replaced = this.connectionManager.registerClient('web', ws);
      if (replaced) {
        this.logger.warning('New web client connected, replacing existing connection');
      }
      this.logger.success('Web client registered successfully');
      return true;
    } else if (ws.role === 'agent') {
      const replaced = this.connectionManager.registerClient('agent', ws);
      if (replaced) {
        this.logger.warning('New agent connected, replacing existing connection');
      }
      this.logger.success('Agent registered successfully');
      return true;
    } else {
      this.logger.error(`Unknown role attempted to register: ${ws.role}`);
      ws.close();
      return false;
    }
  }
}

module.exports = RegistrationService;

