const WebSocket = require('ws');
const config = require('./config');
const logger = require('./utils/logger');
const ConnectionManager = require('./services/ConnectionManager');
const RegistrationService = require('./services/RegistrationService');
const MessageRouter = require('./services/MessageRouter');
const KeepAliveHandler = require('./middleware/keepAlive');
const MessageHandler = require('./handlers/MessageHandler');
const WebSocketHandler = require('./handlers/WebSocketHandler');

// Initialize services
const connectionManager = new ConnectionManager();
const registrationService = new RegistrationService(connectionManager, logger);
const messageRouter = new MessageRouter(connectionManager, logger);
const messageHandler = new MessageHandler(registrationService, messageRouter, KeepAliveHandler, logger);
const wsHandler = new WebSocketHandler(connectionManager, messageHandler, logger);

// Khởi tạo WebSocket server
const wss = new WebSocket.Server({ 
  host: config.host, 
  port: config.port, 
  maxPayload: config.maxPayload 
}, () => {
  const displayHost = config.host === '0.0.0.0' ? 'localhost' : config.host;
  console.log(`WebSocket server running on ws://${displayHost}:${config.port}`);
});

wss.on("connection", (ws) => {
  wsHandler.setup(ws);
});
