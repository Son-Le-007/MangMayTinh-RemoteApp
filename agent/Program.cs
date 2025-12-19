using System;
using System.Collections.Generic;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
namespace server
{
    static class Program
    {
        // New WebSocket-based configuration
        static public IConfiguration Configuration { get; private set; }
        static public ClientWebSocket GatewayWebSocket { get; internal set; }
        private static CancellationTokenSource connectionLoopCancellation = new CancellationTokenSource();
        //static public void sendData(ref string s)
        //{
        //    byte[] data = new Byte[1024];
        //    data = Encoding.ASCII.GetBytes(s);
        //    client.Send(data, data.Length, SocketFlags.None);
        //}
        //static public bool receiveData(ref string s)
        //{
        //    byte[] data = new Byte[1024];
        //    //data = Encoding.ASCII.GetBytes(s);
        //    int rec = Program.client.Receive(data);
        //    if (rec == 0)
        //        return false;
        //    s = Encoding.ASCII.GetString(data, 0, rec);
        //    return true;
        //}
        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        static void Main()
        {
            // Run async initialization synchronously
            MainAsync().GetAwaiter().GetResult();
        }

        static async Task MainAsync()
        {
            // Load configuration from appsettings.json (single source of truth)
            var builder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false);

            Configuration = builder.Build();

            // Connect to Gateway WebSocket server
            string gatewayUrl = Configuration["Gateway:WebSocketUrl"];
            if (string.IsNullOrEmpty(gatewayUrl))
            {
                Console.WriteLine("[ERROR] Gateway WebSocket URL not configured. Please set 'Gateway:WebSocketUrl' in appsettings.json.");
                return;
            }

            // Set up Ctrl+C handler
            Console.CancelKeyPress += (sender, e) =>
            {
                e.Cancel = true; // Don't exit immediately
                Console.WriteLine("\n[INFO] Ctrl+C pressed. Shutting down gracefully...");
                connectionLoopCancellation.Cancel();
            };

            // Start connection and reconnection loop
            _ = Task.Run(async () => await ConnectionLoopAsync(gatewayUrl, connectionLoopCancellation.Token));

            // Handle unhandled exceptions from background threads
            AppDomain.CurrentDomain.UnhandledException += (sender, e) =>
            {
                Console.WriteLine($"[FATAL] Unhandled exception in background thread: {e.ExceptionObject}");
                if (e.ExceptionObject is Exception ex)
                {
                    Console.WriteLine($"[FATAL] Message: {ex.Message}");
                    Console.WriteLine($"[FATAL] Stack trace: {ex.StackTrace}");
                }
            };

            Console.WriteLine("[INFO] Agent started. Running in background. Press Ctrl+C to stop.");
            
            // Keep the application running until cancellation is requested
            try
            {
                // Wait for cancellation token to be signaled
                connectionLoopCancellation.Token.WaitHandle.WaitOne();
            }
            catch (OperationCanceledException)
            {
                // Expected when cancellation is requested
            }
            
            Console.WriteLine("[INFO] Agent shutting down...");
        }

        /// <summary>
        /// Main connection loop that keeps trying to connect and reconnect to the Gateway
        /// </summary>
        static async Task ConnectionLoopAsync(string gatewayUrl, CancellationToken cancellationToken)
        {
            while (!cancellationToken.IsCancellationRequested) // Run until cancelled (Ctrl+C)
            {
                ServerRefactor serverRefactor = null;
                try
                {
                    Console.WriteLine($"[INFO] Connecting to Gateway at: {gatewayUrl}");
                    bool connected = await ConnectToGatewayAsync(gatewayUrl);
                    
                    if (connected)
                    {
                        Console.WriteLine("[SUCCESS] Connected and registered with Gateway. Starting listener...");
                        
                        // CRITICAL FIX: Only start listener after successful registration
                        // Registration is confirmed in ConnectToGatewayAsync by checking
                        // that connection remains open after sending registration message
                        
                        // Create a new ServerRefactor for this connection
                        serverRefactor = new ServerRefactor();
                        
                        // Start the listener - this will run until connection is lost
                        try
                        {
                            await serverRefactor.StartListeningAsync(GatewayWebSocket);
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[ERROR] Listener error: {ex.Message}");
                            Console.WriteLine($"[ERROR] Stack trace: {ex.StackTrace}");
                        }
                        finally
                        {
                            // Clean up ServerRefactor
                            try
                            {
                                serverRefactor?.Dispose();
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[ERROR] Error disposing ServerRefactor: {ex.Message}");
                            }
                        }
                        
                        // Connection lost, clean up WebSocket
                        Console.WriteLine("[INFO] Connection to Gateway lost. Will attempt to reconnect...");
                        if (GatewayWebSocket != null)
                        {
                            try
                            {
                                GatewayWebSocket.Dispose();
                            }
                            catch { }
                            GatewayWebSocket = null;
                        }
                    }
                    else
                    {
                        Console.WriteLine("[WARNING] Failed to connect or register with Gateway.");
                        Console.WriteLine("[WARNING] This may be due to:");
                        Console.WriteLine("[WARNING]   - Network connectivity issues");
                        Console.WriteLine("[WARNING]   - Gateway server not running");
                        Console.WriteLine("[WARNING]   - Registration rejected (invalid role)");
                        Console.WriteLine("[WARNING]   - Connection timeout");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ERROR] Connection loop error: {ex.Message}");
                    Console.WriteLine($"[ERROR] Stack trace: {ex.StackTrace}");
                    
                    // Clean up on error
                    try
                    {
                        serverRefactor?.Dispose();
                    }
                    catch { }
                    
                    if (GatewayWebSocket != null)
                    {
                        try
                        {
                            GatewayWebSocket.Dispose();
                        }
                        catch { }
                        GatewayWebSocket = null;
                    }
                }
                
                // Wait before reconnecting (check for cancellation)
                if (!cancellationToken.IsCancellationRequested)
                {
                    Console.WriteLine("[INFO] Waiting 5 seconds before reconnecting...");
                    try
                    {
                        await Task.Delay(5000, cancellationToken);
                    }
                    catch (OperationCanceledException)
                    {
                        Console.WriteLine("[INFO] Connection loop cancelled.");
                        break;
                    }
                }
            }
        }

        /// <summary>
        /// Establishes an outbound WebSocket connection to the Gateway server.
        /// </summary>
        static async Task<bool> ConnectToGatewayAsync(string gatewayUrl)
        {
            try
            {
                GatewayWebSocket = new ClientWebSocket();
                
                // Convert ws:// or wss:// URL to Uri
                Uri gatewayUri = new Uri(gatewayUrl);
                
                // Connect to Gateway with timeout
                Console.WriteLine("[INFO] Establishing WebSocket connection...");
                using (var connectCts = new CancellationTokenSource(TimeSpan.FromSeconds(10)))
                {
                    await GatewayWebSocket.ConnectAsync(gatewayUri, connectCts.Token);
                }
                
                if (GatewayWebSocket.State != WebSocketState.Open)
                {
                    Console.WriteLine($"[ERROR] WebSocket connection failed. State: {GatewayWebSocket.State}");
                    return false;
                }
                
                Console.WriteLine("[INFO] WebSocket connected. Sending registration...");
                
                // Register as "agent" role with Gateway
                string registerMessage = "{\"type\":\"register\",\"role\":\"agent\"}";
                byte[] registerBytes = Encoding.UTF8.GetBytes(registerMessage);
                using (var sendCts = new CancellationTokenSource(TimeSpan.FromSeconds(5)))
                {
                    await GatewayWebSocket.SendAsync(
                        new ArraySegment<byte>(registerBytes), 
                        WebSocketMessageType.Text, 
                        true, 
                        sendCts.Token);
                }
                
                Console.WriteLine("[INFO] Registration message sent. Waiting for gateway to process...");
                
                // CRITICAL FIX: Wait for registration to be processed by gateway
                // The gateway will close the connection if registration fails (unknown role)
                // If registration succeeds, the connection remains open
                // Wait up to 2 seconds to see if connection stays open
                await Task.Delay(1500); // Give gateway time to process registration
                
                // Check if connection is still open (if closed, registration likely failed)
                if (GatewayWebSocket.State != WebSocketState.Open)
                {
                    Console.WriteLine($"[ERROR] Registration failed - connection closed by gateway. State: {GatewayWebSocket.State}");
                    Console.WriteLine("[ERROR] Gateway may have rejected registration (invalid role or other error)");
                    return false;
                }
                
                Console.WriteLine("[SUCCESS] Registration confirmed - connection still open");
                return true;
            }
            catch (WebSocketException ex)
            {
                Console.WriteLine($"[ERROR] WebSocket error during connection/registration: {ex.Message}");
                if (GatewayWebSocket != null)
                {
                    Console.WriteLine($"[ERROR] WebSocket state: {GatewayWebSocket.State}");
                }
                if (GatewayWebSocket != null)
                {
                    GatewayWebSocket.Dispose();
                    GatewayWebSocket = null;
                }
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Error connecting to Gateway: {ex.Message}");
                Console.WriteLine($"[ERROR] Stack trace: {ex.StackTrace}");
                if (GatewayWebSocket != null)
                {
                    GatewayWebSocket.Dispose();
                    GatewayWebSocket = null;
                }
                return false;
            }
        }
    }
}
