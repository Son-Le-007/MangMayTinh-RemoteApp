using System;
using System.Text.Json;
using System.Threading.Tasks;
using OpenCvSharp;

namespace server.api
{
    /// <summary>
    /// Handles webcam streaming commands: WEBCAM_START, WEBCAM_STOP
    /// Uses OpenCvSharp4.Windows for webcam capture
    /// </summary>
    public class WebcamHandler
    {
        private bool isWebcamActive = false;
        private System.Timers.Timer webcamTimer;
        private VideoCapture videoCapture;
        private Func<object, Task> sendJsonCallback;
        private const int DEFAULT_WEBCAM_FPS = 10;
        private readonly object captureLock = new object();

        /// <summary>
        /// Sets the callback function for sending JSON messages over WebSocket
        /// </summary>
        public void SetSendCallback(Func<object, Task> callback)
        {
            sendJsonCallback = callback;
        }

        /// <summary>
        /// WEBCAM_START: Start streaming webcam frames at specified frame rate
        /// </summary>
        public async Task<object> StartWebcamAsync(JsonElement root)
        {
            try
            {
                // If already active, return success (idempotent)
                if (isWebcamActive)
                {
                    return new
                    {
                        success = true,
                        message = "Webcam streaming already started",
                        frameRate = DEFAULT_WEBCAM_FPS
                    };
                }

                int frameRate = DEFAULT_WEBCAM_FPS;
                
                if (root.TryGetProperty("frameRate", out JsonElement frameRateElement))
                {
                    frameRate = frameRateElement.GetInt32();
                }

                // Initialize webcam capture device (default camera index 0)
                lock (captureLock)
                {
                    videoCapture = new VideoCapture(0);
                    
                    // Check if camera opened successfully
                    if (!videoCapture.IsOpened())
                    {
                        videoCapture?.Dispose();
                        videoCapture = null;
                        return new
                        {
                            success = false,
                            message = "Webcam not found or access denied"
                        };
                    }

                    // Set up timer to capture frames at specified rate
                    webcamTimer = new System.Timers.Timer(1000.0 / frameRate);
                    webcamTimer.Elapsed += async (sender, e) => await CaptureWebcamFrameAsync();
                    webcamTimer.AutoReset = true;
                    webcamTimer.Start();
                    
                    isWebcamActive = true;
                }

                return new
                {
                    success = true,
                    message = "Webcam streaming started",
                    frameRate = frameRate
                };
            }
            catch (Exception ex)
            {
                // Clean up on error
                lock (captureLock)
                {
                    if (videoCapture != null)
                    {
                        videoCapture.Dispose();
                        videoCapture = null;
                    }
                    webcamTimer?.Stop();
                    webcamTimer?.Dispose();
                    webcamTimer = null;
                    isWebcamActive = false;
                }

                return new
                {
                    success = false,
                    message = $"Error starting webcam: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// WEBCAM_STOP: Stop webcam streaming
        /// </summary>
        public async Task<object> StopWebcamAsync()
        {
            try
            {
                lock (captureLock)
                {
                    if (isWebcamActive)
                    {
                        webcamTimer?.Stop();
                        webcamTimer?.Dispose();
                        webcamTimer = null;

                        // Release webcam device
                        videoCapture?.Release();
                        videoCapture?.Dispose();
                        videoCapture = null;

                        isWebcamActive = false;
                    }
                }

                return new
                {
                    success = true,
                    message = "Webcam streaming stopped"
                };
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = $"Error stopping webcam: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Captures a single webcam frame and sends it via WebSocket
        /// This is called periodically by the webcam timer
        /// </summary>
        private async Task CaptureWebcamFrameAsync()
        {
            try
            {
                // Check if we should still be capturing
                if (!isWebcamActive || sendJsonCallback == null)
                {
                    return;
                }

                Mat frame = null;
                byte[] frameBytes = null;

                lock (captureLock)
                {
                    // Check again after acquiring lock
                    if (!isWebcamActive || videoCapture == null || !videoCapture.IsOpened())
                    {
                        return;
                    }

                    // Capture frame from webcam
                    frame = new Mat();
                    if (!videoCapture.Read(frame) || frame.Empty())
                    {
                        frame?.Dispose();
                        return;
                    }

                    // Encode frame as JPEG
                    Cv2.ImEncode(".jpg", frame, out frameBytes, new int[] { (int)ImwriteFlags.JpegQuality, 85 });
                    frame.Dispose();
                }

                if (frameBytes != null && frameBytes.Length > 0)
                {
                    // Create frame message according to API contract
                    var frameMessage = new
                    {
                        type = "WEBCAM_FRAME",
                        format = "jpeg",
                        frameData = Convert.ToBase64String(frameBytes)
                    };

                    // Send via WebSocket using callback
                    await sendJsonCallback(frameMessage);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Error capturing webcam frame: {ex.Message}");
                // Don't throw - just log the error and continue
            }
        }

        /// <summary>
        /// Cleanup method for webcam
        /// </summary>
        public void Stop()
        {
            try
            {
                lock (captureLock)
                {
                    if (isWebcamActive)
                    {
                        webcamTimer?.Stop();
                        webcamTimer?.Dispose();
                        webcamTimer = null;

                        videoCapture?.Release();
                        videoCapture?.Dispose();
                        videoCapture = null;

                        isWebcamActive = false;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Error stopping webcam: {ex.Message}");
            }
        }
    }
}

