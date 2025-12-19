# Remote App System

## 1. Giới thiệu (Overview)

**Remote App** là hệ thống điều khiển máy tính từ xa cho phép quản trị viên giám sát và điều khiển các máy client Windows thông qua giao diện web. Hệ thống giải quyết bài toán quản lý và giám sát máy tính từ xa trong môi trường doanh nghiệp hoặc giáo dục, giúp hỗ trợ kỹ thuật, kiểm soát hệ thống mà không cần có mặt trực tiếp tại máy client. Đối tượng sử dụng chính là quản trị viên hệ thống, IT support, hoặc giáo viên quản lý phòng máy. Kiến trúc hệ thống gồm 3 thành phần: **Web** (giao diện người dùng Flask), **Gateway** (server WebSocket Node.js trung gian), và **Agent** (ứng dụng C# chạy trên máy client Windows). Các component giao tiếp với nhau qua WebSocket protocol, cho phép trao đổi lệnh và dữ liệu real-time.

---

## 2. Hướng dẫn cài đặt & chạy (Setup & Run)

### Yêu cầu môi trường

- **.NET 6.0 SDK** hoặc Runtime (cho Agent)
  - Download: https://dotnet.microsoft.com/download/dotnet/6.0
- **Node.js** version 14+ và npm (cho Gateway)
  - Download: https://nodejs.org/
- **Python 3.7+** và pip (cho Web)
  - Download: https://www.python.org/downloads/
- **Trình duyệt web** hỗ trợ WebSocket (Chrome, Firefox, Edge, Safari)

### Cài đặt từng component

#### 1. Agent (C# .NET)
```bash
cd agent
dotnet restore
dotnet build
```

#### 2. Gateway (Node.js)
```bash
cd gateway
npm install
```

#### 3. Web (Python Flask)
```bash
cd web
pip install flask
```

### Cấu hình

Tạo hoặc chỉnh sửa file `appsettings.json` ở thư mục gốc:

```json
{
  "GatewayServer": "ws://localhost:8080",
  "Port": 5000
}
```

- **GatewayServer**: URL WebSocket của Gateway server
- **Port**: Port cho Web component (Flask server)

### Chạy hệ thống

**Thứ tự khởi động (quan trọng):**

1. **Gateway** (chạy đầu tiên):
   ```bash
   cd gateway
   npm start
   ```
   Server sẽ lắng nghe trên `ws://localhost:8080`

2. **Agent** (chạy trên máy client Windows):
   ```bash
   cd agent
   dotnet run
   ```
   Agent sẽ tự động kết nối tới Gateway

3. **Web** (chạy trên máy quản trị):
   ```bash
   cd web
   python main.py
   ```
   Mở trình duyệt: `http://localhost:5000`

---

## 3. Kiến trúc tổng thể (System Architecture)

Hệ thống Remote App được xây dựng theo kiến trúc 3 tầng với giao tiếp real-time qua WebSocket:

```
┌─────────────────┐         WebSocket          ┌──────────────┐         WebSocket          ┌─────────────┐
│   Web Client    │ ◄─────────────────────────► │   Gateway    │ ◄─────────────────────────► │   Agent     │
│  (Browser)      │                             │  (Node.js)   │                             │   (C# .NET) │
│                 │                             │              │                             │             │
│ - HTML/CSS/JS   │                             │ - Message    │                             │ - Windows   │
│ - Flask Server  │                             │   Router     │                             │   APIs      │
│                 │                             │ - Connection │                             │ - OpenCV    │
└─────────────────┘                             │   Manager    │                             └─────────────┘
                                                └──────────────┘
```

### Mô tả 3 thành phần chính

1. **Web Component** (Python Flask)
   - Giao diện người dùng chạy trên trình duyệt
   - Flask server serve HTML/CSS/JavaScript
   - JavaScript client kết nối WebSocket tới Gateway
   - Xử lý và hiển thị dữ liệu từ Agent

2. **Gateway Component** (Node.js)
   - Server WebSocket trung gian
   - Quản lý kết nối từ Web và Agent
   - Định tuyến message hai chiều (Web ↔ Agent)
   - Xử lý keep-alive (ping/pong) để duy trì kết nối

3. **Agent Component** (C# .NET)
   - Ứng dụng chạy trên máy client Windows
   - Kết nối outbound tới Gateway (vượt qua firewall/NAT)
   - Thực thi lệnh từ Web (process, screenshot, webcam, keylog, system)
   - Tự động reconnect khi mất kết nối

### Cách giao tiếp

- **Protocol**: WebSocket (ws://)
- **Data Format**: JSON messages
- **Message Flow**:
  - Web gửi command → Gateway forward → Agent xử lý
  - Agent gửi response → Gateway forward → Web hiển thị
- **Registration**: Mỗi client đăng ký với role (`web` hoặc `agent`)
- **Keep-alive**: Ping/pong mỗi 30 giây để duy trì kết nối

---

## 4. Công nghệ sử dụng (Tech Stack)

### Web Component
- **Backend**: Python Flask
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **WebSocket Client**: Native WebSocket API
- **Architecture**: Client-side routing, modular JavaScript

### Gateway Component
- **Runtime**: Node.js (v14+)
- **WebSocket Library**: `ws` (^8.15.0)
- **Architecture**: Service-oriented (ConnectionManager, MessageRouter, RegistrationService)

### Agent Component
- **Runtime**: .NET 6.0
- **Language**: C#
- **Libraries**:
  - `OpenCvSharp4.Windows` (v4.8.0) - Webcam streaming
  - `Microsoft.Extensions.Configuration` - Configuration management
- **APIs**: Windows APIs (Process, Screenshot, Keylogger, System Control)

### Protocol & Communication
- **WebSocket**: Real-time bidirectional communication
- **JSON**: Message serialization
- **TCP/IP**: Underlying network protocol

---

## 5. Chức năng chính (Features)

### Quản lý Process & Application
- **PROCESS_LIST**: Liệt kê tất cả processes đang chạy
- **PROCESS_KILL**: Dừng process theo Process ID
- **PROCESS_START**: Khởi động process mới
- **APPLICATION_LIST**: Liệt kê các ứng dụng Windows đang mở
- **APPLICATION_KILL**: Đóng ứng dụng
- **APPLICATION_START**: Mở ứng dụng mới

### Screenshot
- **TAKEPIC**: Chụp màn hình máy client
- Trả về ảnh dạng JPEG base64-encoded
- Hiển thị real-time trên web dashboard

### Webcam Streaming
- **WEBCAM_START**: Bật webcam stream
- **WEBCAM_STOP**: Tắt webcam stream
- Stream frames liên tục qua WebSocket
- Hỗ trợ nhiều camera devices

### Keylogger
- **KEYLOG_HOOK**: Bật keylogger
- **KEYLOG_UNHOOK**: Tắt keylogger
- **KEYLOG_PRINT**: Đọc và hiển thị keystrokes đã ghi
- Ghi log vào file và hiển thị trên web

### System Control
- **SHUTDOWN**: Tắt máy client
- **RESTART**: Khởi động lại máy client
- Yêu cầu quyền Administrator

---

## 📝 Ghi chú

- **Agent** chỉ chạy được trên Windows do sử dụng Windows APIs
- **Gateway** và **Web** có thể chạy trên Windows, Linux, hoặc macOS
- Đảm bảo các port không bị firewall chặn:
  - Gateway: Port 8080 (WebSocket)
  - Web: Port 5000 (HTTP, mặc định)
- OpenCvSharp yêu cầu Visual C++ Redistributable trên Windows

---

## 🔗 Tài liệu chi tiết

- [Agent README](agent/README.md) - Chi tiết về Agent component
- [Gateway README](gateway/README.md) - Chi tiết về Gateway component
- [Web README](web/README.md) - Chi tiết về Web component
- [Requirements](requirement.md) - Yêu cầu hệ thống và dependencies

---
