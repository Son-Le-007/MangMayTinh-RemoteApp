using System;
using System.Diagnostics;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace server.api
{
    /// <summary>
    /// Handles application management commands: APPLICATION_LIST, APPLICATION_KILL, APPLICATION_START
    /// </summary>
    public class ApplicationHandler
    {
        /// <summary>
        /// APPLICATION_LIST: Return list of windowed applications only
        /// </summary>
        public async Task<object> GetApplicationListAsync()
        {
            try
            {
                Process[] processes = Process.GetProcesses();

                // Filter only windowed applications (MainWindowTitle.Length > 0)
                var applicationList = processes
                    .Where(p => p.MainWindowTitle.Length > 0)
                    .Select(p => new
                    {
                        name = p.ProcessName,
                        processId = p.Id,
                        threadCount = p.Threads.Count
                    }).ToArray();

                return new
                {
                    success = true,
                    count = applicationList.Length,
                    applications = applicationList
                };
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = $"Error getting application list: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// APPLICATION_KILL: Kill windowed application by PID
        /// </summary>
        public async Task<object> KillApplicationAsync(JsonElement root)
        {
            try
            {
                if (!root.TryGetProperty("processId", out JsonElement processIdElement))
                {
                    return new
                    {
                        success = false,
                        message = "Missing 'processId' parameter"
                    };
                }

                int processId = processIdElement.GetInt32();

                try
                {
                    Process process = Process.GetProcessById(processId);
                    
                    // Check if it's a windowed application
                    if (process.MainWindowTitle.Length > 0)
                    {
                        process.Kill();

                        return new
                        {
                            success = true,
                            message = "Đã diệt chương trình"
                        };
                    }
                    else
                    {
                        return new
                        {
                            success = false,
                            message = "Không tìm thấy chương trình"
                        };
                    }
                }
                catch (ArgumentException)
                {
                    return new
                    {
                        success = false,
                        message = "Không tìm thấy chương trình"
                    };
                }
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = $"Error killing application: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// APPLICATION_START: Start a new application
        /// </summary>
        public async Task<object> StartApplicationAsync(JsonElement root)
        {
            try
            {
                if (!root.TryGetProperty("processName", out JsonElement processNameElement))
                {
                    return new
                    {
                        success = false,
                        message = "Missing 'processName' parameter"
                    };
                }

                string processName = processNameElement.GetString();
                string executableName = processName + ".exe";

                try
                {
                    Process.Start(executableName);

                    return new
                    {
                        success = true,
                        message = "Chương trình đã được bật"
                    };
                }
                catch (Exception)
                {
                    return new
                    {
                        success = false,
                        message = "Lỗi"
                    };
                }
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = $"Error starting application: {ex.Message}"
                };
            }
        }
    }
}

