# WebSocket API Contract

## Overview

This document defines the complete WebSocket API contract for the Remote App server. All commands are sent as JSON messages over WebSocket connections. The architecture follows a loop-free, event-driven design where each command is self-contained with no nested loops or modes. Each request receives an immediate response with a consistent schema including a `success` boolean field.

## Command Categories

The API is organized into six main categories:

1. **Keylogger Commands** - Control keystroke logging
2. **System Commands** - Control system power state
3. **Screenshot Commands** - Capture screen images
4. **Process Management** - List, start, and terminate processes
5. **Application Management** - Manage windowed applications
6. **Webcam Streaming** - Control webcam video streaming

## 1. Keylogger Commands

#### `KEYLOG_HOOK`

**Request:**

```json
{
  "command": "KEYLOG_HOOK"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Keylogger started"
}
```

**Logic:** Resume keylogger thread, clear log file. Track state in `isKeylogActive` instance variable.

---

#### `KEYLOG_UNHOOK`

**Request:**

```json
{
  "command": "KEYLOG_UNHOOK"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Keylogger stopped"
}
```

**Logic:** Suspend keylogger thread. Update `isKeylogActive` state.

---

#### `KEYLOG_PRINT`

**Request:**

```json
{
  "command": "KEYLOG_PRINT"
}
```

**Response:**

```json
{
  "success": true,
  "data": "captured keystrokes here..."
}
```

**Logic:** Read from log file, return contents, clear file. Return empty string if no keys logged.

---

## 2. System Commands

#### `SHUTDOWN`

**Request:**

```json
{
  "command": "SHUTDOWN"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Shutting down..."
}
```

**Logic:** Execute `System.Diagnostics.Process.Start("ShutDown", "-s")`. Immediate action, no confirmation.

---

#### `RESTART`

**Request:**

```json
{
  "command": "RESTART"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Restarting..."
}
```

**Logic:** Execute `System.Diagnostics.Process.Start("ShutDown", "-r")`. Immediate action, no confirmation.

---

## 3. Screenshot Commands

#### `TAKEPIC`

**Request:**

```json
{
  "command": "TAKEPIC"
}
```

**Response:**

```json
{
  "success": true,
  "format": "jpeg",
  "imageData": "iVBORw0KGgoAAAANSUhEUg..."
}
```

**Logic:** Capture primary screen, convert to BMP format, encode as base64, send in JSON response. Each request is independent.

---

## 4. Process Management Commands

#### `PROCESS_LIST`

**Request:**

```json
{
  "command": "PROCESS_LIST"
}
```

**Response:**

```json
{
  "success": true,
  "count": 127,
  "processes": [
    {
      "name": "chrome",
      "processId": 1234,
      "threadCount": 45
    },
    {
      "name": "explorer",
      "processId": 5678,
      "threadCount": 23
    }
  ]
}
```

**Logic:** Call `Process.GetProcesses()`, return all processes with name, PID, and thread count.

---

#### `PROCESS_KILL`

**Request:**

```json
{
  "command": "PROCESS_KILL",
  "processId": 1234
}
```

**Response:**

```json
{
  "success": true,
  "message": "Đã diệt process"
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Lỗi"
}
```

**Logic:** Find process by PID, call `Process.Kill()`. Return success/error status.

---

#### `PROCESS_START`

**Request:**

```json
{
  "command": "PROCESS_START",
  "processName": "notepad"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Process đã được bật"
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Lỗi"
}
```

**Logic:** Append `.exe` to name, call `Process.Start()`. Return success/error status.

---

## 5. Application Management Commands

#### `APPLICATION_LIST`

**Request:**

```json
{
  "command": "APPLICATION_LIST"
}
```

**Response:**

```json
{
  "success": true,
  "count": 8,
  "applications": [
    {
      "name": "chrome",
      "processId": 1234,
      "threadCount": 45
    }
  ]
}
```

**Logic:** Call `Process.GetProcesses()`, filter only processes with `MainWindowTitle.Length > 0` (windowed applications).

---

#### `APPLICATION_KILL`

**Request:**

```json
{
  "command": "APPLICATION_KILL",
  "processId": 1234
}
```

**Response:**

```json
{
  "success": true,
  "message": "Đã diệt chương trình"
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Không tìm thấy chương trình"
}
```

**Logic:** Find windowed application by PID, call `Process.Kill()`. Return success/error/not found status.

---

#### `APPLICATION_START`

**Request:**

```json
{
  "command": "APPLICATION_START",
  "processName": "notepad"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Chương trình đã được bật"
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Lỗi"
}
```

**Logic:** Append `.exe` to name, call `Process.Start()`. Return success/error status.

---

## 6. Webcam Streaming Commands

#### `WEBCAM_START`

**Request:**

```json
{
  "command": "WEBCAM_START",
  "frameRate": 10
}
```

**Response:**

```json
{
  "success": true,
  "message": "Webcam streaming started",
  "frameRate": 10
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Webcam not found or access denied"
}
```

**Logic:** Initialize webcam capture device, start background timer/thread that captures frames at specified rate (default 10 FPS). Each frame is captured as JPEG, encoded to base64, and sent as WebSocket message to client. Track state in `isWebcamActive` and `webcamTimer` instance variables.

**Frame Message Format (sent periodically):**

```json
{
  "type": "WEBCAM_FRAME",
  "format": "jpeg",
  "frameData": "/9j/4AAQSkZJRgABAQAA..."
}
```

---

#### `WEBCAM_STOP`

**Request:**

```json
{
  "command": "WEBCAM_STOP"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Webcam streaming stopped"
}
```

**Logic:** Stop background timer/thread, release webcam device, update `isWebcamActive` state. If webcam not running, return success anyway (idempotent operation).

---
