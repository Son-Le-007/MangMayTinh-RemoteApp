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
                // Capture primary screen
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
                    screenshot.Save(ms, ImageFormat.Bmp);
                    byte[] imageBytes = ms.ToArray();
                    string base64Image = Convert.ToBase64String(imageBytes);

                    screenshot.Dispose();

                    return new
                    {
                        success = true,
                        format = "base64",
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

