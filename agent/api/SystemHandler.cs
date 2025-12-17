using System;
using System.Diagnostics;
using System.Threading.Tasks;

namespace server.api
{
    /// <summary>
    /// Handles system-related commands: SHUTDOWN, RESTART
    /// </summary>
    public class SystemHandler
    {
        /// <summary>
        /// SHUTDOWN: Execute system shutdown
        /// </summary>
        public async Task<object> ShutdownAsync()
        {
            try
            {
                // Execute shutdown command
                Process.Start("shutdown", "-s");

                return new
                {
                    success = true,
                    message = "Shutting down..."
                };
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = $"Error executing shutdown: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// RESTART: Execute system restart
        /// </summary>
        public async Task<object> RestartAsync()
        {
            try
            {
                // Execute restart command
                Process.Start("shutdown", "-r");

                return new
                {
                    success = true,
                    message = "Restarting..."
                };
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = $"Error executing restart: {ex.Message}"
                };
            }
        }
    }
}

