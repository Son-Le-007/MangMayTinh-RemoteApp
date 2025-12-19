using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace server.api
{
    /// <summary>
    /// Handles screenshot-related commands: TAKEPIC
    /// </summary>
    public class ScreenshotHandler
    {
        /// <summary>
        /// TAKEPIC: Capture screen and return as base64-encoded image
        /// </summary>
        public async Task<object> TakePictureAsync()
        {
            try
            {
                // Capture primary screen at its native resolution
                Bitmap screenshot = new Bitmap(
                    Screen.PrimaryScreen.Bounds.Width,
                    Screen.PrimaryScreen.Bounds.Height,
                    PixelFormat.Format32bppArgb
                );

                using (Graphics graphics = Graphics.FromImage(screenshot))
                {
                    graphics.CopyFromScreen(
                        Screen.PrimaryScreen.Bounds.X,
                        Screen.PrimaryScreen.Bounds.Y,
                        0, 0,
                        Screen.PrimaryScreen.Bounds.Size,
                        CopyPixelOperation.SourceCopy
                    );
                }

                // Convert to BMP format and encode as base64
                using (MemoryStream ms = new MemoryStream())
                {
                    // Encode as JPEG so it matches what the web client expects
                    screenshot.Save(ms, ImageFormat.Jpeg);
                    byte[] imageBytes = ms.ToArray();
                    
                    // Save image to screenshot folder before sending to gateway
                    try
                    {
                        string screenshotFolder = Path.Combine(Directory.GetCurrentDirectory(), "screenshot");
                        if (!Directory.Exists(screenshotFolder))
                        {
                            Directory.CreateDirectory(screenshotFolder);
                        }
                        
                        string screenshotPath = Path.Combine(screenshotFolder, "screenshot-image.jpg");
                        File.WriteAllBytes(screenshotPath, imageBytes);
                        Console.WriteLine($"[SCREENSHOT] Image saved to: {screenshotPath}");
                    }
                    catch (Exception saveEx)
                    {
                        Console.WriteLine($"[WARNING] Failed to save screenshot to file: {saveEx.Message}");
                        // Continue even if saving fails - still send to gateway
                    }
                    
                    string base64Image = Convert.ToBase64String(imageBytes);

                    screenshot.Dispose();

                    // Log image length before sending to gateway
                    Console.WriteLine($"[SCREENSHOT] Image length before sending to gateway: {base64Image.Length} bytes (base64)");

                    return new
                    {
                        success = true,
                        // This is the MIME subtype used on the web client:
                        // data:image/<format>;base64,<data>
                        format = "jpeg",
                        imageData = base64Image
                    };
                }
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    message = $"Error capturing screenshot: {ex.Message}"
                };
            }
        }
    }
}

