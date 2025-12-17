using System;
using System.Diagnostics;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace server.api
{
    /// <summary>
    /// Handles process management commands: PROCESS_LIST, PROCESS_KILL, PROCESS_START
    /// </summary>
    public class ProcessHandler
    {
        /// <summary>
        /// PROCESS_LIST: Return list of all running processes
        /// </summary>
        public async Task<object> GetProcessListAsync()
        {
            try
            {
                Process[] processes = Process.GetProcesses();

                var processList = processes.Select(p => new
                {
                    name = p.ProcessName,
                    processId = p.Id,
                    threadCount = p.Threads.Count
                }).ToArray();

                return new
                {
                    success = true,
                    count = processList.Length,
                    processes = processList
                };
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = $"Error getting process list: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// PROCESS_KILL: Kill process by PID
        /// </summary>
        public async Task<object> KillProcessAsync(JsonElement root)
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
                    process.Kill();

                    return new
                    {
                        success = true,
                        message = "Đã diệt process"
                    };
                }
                catch (ArgumentException)
                {
                    // Process not found
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
                    message = $"Error killing process: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// PROCESS_START: Start a new process
        /// </summary>
        public async Task<object> StartProcessAsync(JsonElement root)
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
                        message = "Process đã được bật"
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
                    message = $"Error starting process: {ex.Message}"
                };
            }
        }
    }
}

