const fs = require('fs');
const path = require('path');

/**
 * Server configuration
 * Reads from appsettings.json, can be overridden with environment variables
 */
function loadConfig() {
  let host = '0.0.0.0';
  let port = 8080;

  // Read from appsettings.json
  try {
    const configPath = path.join(__dirname, '../../appsettings.json');
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (configData.GatewayServer) {
        // Parse WebSocket URL: ws://host:port
        const urlMatch = configData.GatewayServer.match(/^ws:\/\/([^:]+):(\d+)$/);
        if (urlMatch) {
          host = urlMatch[1];
          port = parseInt(urlMatch[2], 10);
        }
      }
    }
  } catch (error) {
    console.warn('Warning: Could not read appsettings.json, using defaults:', error.message);
  }

  // Environment variables override appsettings.json
  return {
    host: process.env.GATEWAY_HOST || host,
    port: parseInt(process.env.GATEWAY_PORT || port.toString(), 10),
    maxPayload: parseInt(process.env.GATEWAY_MAX_PAYLOAD || (50 * 1024 * 1024).toString(), 10)
  };
}

module.exports = loadConfig();

