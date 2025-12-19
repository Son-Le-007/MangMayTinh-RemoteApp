# Agent Component

## 1. Giới thiệu component

Agent là component chạy trên máy client Windows, đóng vai trò thực thi các lệnh điều khiển từ xa.

**Vai trò trong hệ thống:**
- Nhận và thực thi các lệnh từ Gateway
- Thu thập thông tin hệ thống (process, application, screenshot, keylog)
- Điều khiển hệ thống (shutdown, restart, kill process)
- Stream dữ liệu media (webcam)

**Giao tiếp:**
- Kết nối **outbound** tới Gateway qua WebSocket
- Gửi/nhận messages dạng JSON

**Môi trường chạy:**
- Chạy trên **máy client Windows**
- Yêu cầu .NET 6.0 runtime
- Cần quyền admin để thực thi một số lệnh hệ thống

---

## 2. Hướng dẫn cài đặt

### Dependencies & Runtime

- **.NET 6.0 SDK** (hoặc runtime)
- **OpenCvSharp4.Windows** (NuGet package) - cho chức năng webcam
- **Microsoft.Extensions.Configuration** (NuGet package)

### Các bước cài đặt

1. **Cài đặt .NET 6.0 SDK**
   - Download từ: https://dotnet.microsoft.com/download/dotnet/6.0
   - Chọn bản "SDK" cho Windows

2. **Cấu hình Gateway URL**
   - Chỉnh sửa file `appsettings.json` ở thư mục gốc project
   - Đặt `GatewayServer` với URL WebSocket của Gateway (ví dụ: `"ws://localhost:8080"`)

3. **Build project**
   ```bash
   cd agent
   dotnet restore
   dotnet build
   ```

4. **Chạy agent**
   ```bash
   dotnet run
   ```
   Hoặc chạy file `.exe` trong thư mục `bin/Debug/net6.0-windows/`

---

## 3. Luồng hoạt động (Workflow)

1. **Khởi động**
   - Agent đọc config từ `appsettings.json`
   - Thiết lập DPI awareness cho Windows

2. **Kết nối Gateway**
   - Thiết lập WebSocket connection tới Gateway
   - Gửi registration message với `role: "agent"`
   - Chờ Gateway xác nhận (nếu connection đóng = registration thất bại)

3. **Lắng nghe commands**
   - Nhận JSON messages từ Gateway
   - Parse command field
   - Route tới handler tương ứng
   - Xử lý và gửi response JSON

4. **Keepalive**
   - Gửi "ping" mỗi 30 giây để giữ connection
   - Gateway sẽ phản hồi "pong"

5. **Tự động reconnect**
   - Nếu mất kết nối, chờ 5 giây rồi thử kết nối lại
   - Loop cho đến khi nhận Ctrl+C

---

## 4. Giao thức & dữ liệu

### WebSocket Endpoint

- Agent kết nối **tới** Gateway (outbound connection)
- URL cấu hình trong `appsettings.json` → `GatewayServer`
- Protocol: `ws://`

### Ví dụ JSON Message

**Request từ Gateway:**
```json
{
  "command": "KEYLOG_HOOK"
}
```

**Response từ Agent:**
```json
{
  "success": true,
  "message": "Keylogger started"
}
```

Hoặc với data:
```json
{
  "success": true,
  "data": "..."
}
```

**Error response:**
```json
{
  "success": false,
  "message": "Error message here"
}
```

### Ví dụ Commands

**Keylogger:**
- `KEYLOG_HOOK` - Bật keylogger
- `KEYLOG_UNHOOK` - Tắt keylogger  
- `KEYLOG_PRINT` - Đọc và trả về log

**System:**
- `SHUTDOWN` - Tắt máy
- `RESTART` - Khởi động lại

**Process:**
- `PROCESS_LIST` - Liệt kê processes
- `PROCESS_KILL` - Kill process (cần `processId`)
- `PROCESS_START` - Khởi động process (cần `path`)

**Application:**
- `APPLICATION_LIST` - Liệt kê applications
- `APPLICATION_KILL` - Đóng application
- `APPLICATION_START` - Mở application

**Media:**
- `TAKEPIC` - Chụp screenshot
- `WEBCAM_START` - Bật webcam stream (cần `deviceId`)
- `WEBCAM_STOP` - Tắt webcam stream

---

## 5. Các module / hàm chính

### Program.cs
- **Chức năng**: Entry point, quản lý connection loop và reconnection logic
- **Trách nhiệm**: 
  - Load configuration
  - Thiết lập kết nối Gateway
  - Xử lý shutdown gracefully (Ctrl+C)

### server.cs (ServerRefactor)
- **Chức năng**: Message router và WebSocket listener
- **Trách nhiệm**:
  - Parse và route commands tới handlers
  - Quản lý WebSocket receive loop
  - Keepalive ping/pong
  - Gửi responses

### Keylog.cs (InterceptKeys)
- **Chức năng**: Keylogger implementation sử dụng Windows Hook
- **Trách nhiệm**: 
  - Hook keyboard events
  - Ghi log vào file `fileKeyLog.txt`
  - Xử lý key mapping (shift, caps lock, special keys)

### api/KeyloggerHandler.cs
- **Chức năng**: Handler cho keylogger commands
- **Trách nhiệm**: Hook/Unhook, đọc và clear log file

### api/SystemHandler.cs
- **Chức năng**: Handler cho system commands
- **Trách nhiệm**: Shutdown, restart hệ thống

### api/ProcessHandler.cs
- **Chức năng**: Handler cho process management
- **Trách nhiệm**: List, kill, start processes

### api/ApplicationHandler.cs
- **Chức năng**: Handler cho application management
- **Trách nhiệm**: List, kill, start Windows applications

### api/ScreenshotHandler.cs
- **Chức năng**: Handler cho screenshot
- **Trách nhiệm**: Chụp màn hình và trả về base64 image

### api/WebcamHandler.cs
- **Chức năng**: Handler cho webcam streaming
- **Trách nhiệm**: Khởi động/dừng webcam, stream frames qua WebSocket

---

## 6. Ghi chú riêng của component

### Giới hạn

- **Platform**: Chỉ chạy trên Windows (sử dụng Windows APIs)
- **Quyền**: Một số lệnh cần quyền admin (shutdown, kill process)
- **Keylogger**: Chỉ ghi được keystrokes trong phạm vi Windows, không capture được trong một số ứng dụng bảo mật cao
- **Webcam**: Phụ thuộc vào OpenCvSharp, cần device hỗ trợ

### Lý do thiết kế

- **Outbound connection**: Agent kết nối tới Gateway (không phải ngược lại) để dễ dàng vượt qua firewall/NAT
- **Auto-reconnect**: Tự động reconnect để đảm bảo tính khả dụng
- **Handler pattern**: Tách biệt logic theo từng loại command, dễ maintain và mở rộng
- **JSON protocol**: Đơn giản, dễ debug, dễ tương thích với web client

### Những điểm cần cải tiến

- **Security**: Chưa có authentication/encryption, cần thêm TLS và xác thực
- **Error handling**: Cần logging chi tiết hơn, error recovery tốt hơn
- **Performance**: Keylogger đang ghi file liên tục, có thể optimize với buffer
- **Multi-monitor**: Screenshot chỉ capture primary monitor
- **Configuration**: Nên có config cho timeout, retry count, etc.

