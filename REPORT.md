# Remote App System - Báo Cáo Tổng Quan

## 1. Giới thiệu hệ thống

**Remote App** là hệ thống điều khiển máy tính từ xa cho phép quản trị viên giám sát và điều khiển các máy client Windows thông qua giao diện web. Hệ thống được thiết kế để giải quyết bài toán quản lý và giám sát máy tính từ xa trong môi trường doanh nghiệp hoặc giáo dục, giúp hỗ trợ kỹ thuật và kiểm soát hệ thống mà không cần có mặt trực tiếp tại máy client.

**Đối tượng sử dụng:** Quản trị viên hệ thống, IT support, giáo viên quản lý phòng máy.

**Kiến trúc:** Hệ thống gồm 3 thành phần chính giao tiếp qua WebSocket protocol:
- **Web Component**: Giao diện người dùng Flask (Python)
- **Gateway Component**: Server WebSocket trung gian (Node.js)
- **Agent Component**: Ứng dụng thực thi lệnh trên máy client (C# .NET)

---

## 2. Kiến trúc hệ thống

Hệ thống được xây dựng theo kiến trúc 3 tầng với giao tiếp real-time qua WebSocket:

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

### Mô tả các thành phần:

**Web Component (Python Flask)**
- Giao diện người dùng chạy trên trình duyệt
- Flask server serve HTML/CSS/JavaScript
- JavaScript client kết nối WebSocket tới Gateway
- Xử lý và hiển thị dữ liệu từ Agent

**Gateway Component (Node.js)**
- Server WebSocket trung gian
- Quản lý kết nối từ Web và Agent
- Định tuyến message hai chiều (Web ↔ Agent)
- Xử lý keep-alive (ping/pong) để duy trì kết nối

**Agent Component (C# .NET)**
- Ứng dụng chạy trên máy client Windows
- Kết nối outbound tới Gateway (vượt qua firewall/NAT)
- Thực thi lệnh từ Web (process, screenshot, webcam, keylog, system)
- Tự động reconnect khi mất kết nối

### Cách giao tiếp:
- **Protocol**: WebSocket (ws://)
- **Data Format**: JSON messages
- **Message Flow**: Web → Gateway → Agent → Gateway → Web
- **Registration**: Mỗi client đăng ký với role (`web` hoặc `agent`)
- **Keep-alive**: Ping/pong mỗi 30 giây để duy trì kết nối

---

## 3. Workflow

### Luồng hoạt động tổng thể:

1. **Khởi động hệ thống:**
   - Gateway khởi động đầu tiên, lắng nghe trên port 8080
   - Agent kết nối tới Gateway và đăng ký với role "agent"
   - Web khởi động Flask server, client kết nối tới Gateway và đăng ký với role "web"

2. **Gửi lệnh:**
   - Người dùng thao tác trên web dashboard
   - JavaScript tạo JSON command theo API contract
   - Gửi qua WebSocket tới Gateway
   - Gateway forward message tới Agent

3. **Xử lý lệnh:**
   - Agent nhận message, parse command field
   - Route tới handler tương ứng
   - Thực thi lệnh (process, screenshot, webcam, keylog, system)
   - Tạo response JSON và gửi về Gateway

4. **Nhận phản hồi:**
   - Gateway forward response từ Agent về Web
   - Web message router phân loại và gọi handler tương ứng
   - UI cập nhật hiển thị (bảng, hình ảnh, keylog...)

5. **Duy trì kết nối:**
   - Keep-alive ping/pong mỗi 30 giây
   - Agent tự động reconnect nếu mất kết nối

---

## 4. Các tính năng chính

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

## 5. Các hàm chính

### Agent Component (C#)

**Program.cs**
- Entry point, quản lý connection loop và reconnection logic
- Load configuration, thiết lập kết nối Gateway, xử lý shutdown gracefully

**server.cs (ServerRefactor)**
- Message router và WebSocket listener
- Parse và route commands tới handlers, quản lý WebSocket receive loop, keepalive ping/pong

**Keylog.cs (InterceptKeys)**
- Keylogger implementation sử dụng Windows Hook
- Hook keyboard events, ghi log vào file, xử lý key mapping

**api/KeyloggerHandler.cs**
- Handler cho keylogger commands (Hook/Unhook, đọc và clear log file)

**api/SystemHandler.cs**
- Handler cho system commands (Shutdown, restart hệ thống)

**api/ProcessHandler.cs**
- Handler cho process management (List, kill, start processes)

**api/ApplicationHandler.cs**
- Handler cho application management (List, kill, start Windows applications)

**api/ScreenshotHandler.cs**
- Handler cho screenshot (Chụp màn hình và trả về base64 image)

**api/WebcamHandler.cs**
- Handler cho webcam streaming (Khởi động/dừng webcam, stream frames qua WebSocket)

### Gateway Component (Node.js)

**server.js**
- Entry point, khởi tạo WebSocket server, bind port, xử lý connection events

**services/ConnectionManager.js**
- Quản lý state của các kết nối, lưu trữ webClient và agentClient

**services/RegistrationService.js**
- Xử lý logic đăng ký client, validate role, đăng ký client vào ConnectionManager

**services/MessageRouter.js**
- Định tuyến message giữa web và agent, xác định hướng routing và forward message

**handlers/WebSocketHandler.js**
- Quản lý lifecycle của WebSocket connection, setup event handlers

**handlers/MessageHandler.js**
- Xử lý và parse message, xử lý registration, keep-alive, và routing

**middleware/keepAlive.js**
- Xử lý ping/pong messages để duy trì kết nối

### Web Component (Python/JavaScript)

**Backend (Python):**
- **main.py**: Flask server, route `/` render dashboard
- **config.py**: Load cấu hình Gateway URL và port

**Frontend Core:**
- **core/websocket.js**: Quản lý kết nối WebSocket, đăng ký với Gateway
- **core/state.js**: Biến global state (WebSocket instance, flags...)

**Components:**
- **components/StatusLogger.js**: Hiển thị status messages
- **components/ViewManager.js**: Quản lý chuyển đổi giữa các view
- **components/TableRenderer.js**: Render bảng dữ liệu processes/apps

**Handlers:**
- **handlers/index.js**: Message router, phân loại và route messages
- **handlers/processHandler.js**: Xử lý PROCESS_LIST, APPLICATION_LIST responses
- **handlers/mediaHandler.js**: Xử lý screenshot responses
- **handlers/webcamHandler.js**: Xử lý webcam frames và start/stop responses
- **handlers/keylogHandler.js**: Xử lý KEYLOG_PRINT responses
- **handlers/errorHandler.js**: Xử lý error responses

**Commands:**
- **commands/processCommands.js**: Functions cho process/app management
- **commands/mediaCommands.js**: Functions cho screenshot
- **commands/keyloggerCommands.js**: Functions cho keylogger
- **commands/systemCommands.js**: Functions cho system commands
- **commands/stateManager.js**: Quản lý state transitions

---

## 6. Công nghệ sử dụng

- **Web Component**: Python Flask, HTML5/CSS3/JavaScript (ES6+), Native WebSocket API
- **Gateway Component**: Node.js (v14+), WebSocket library `ws`
- **Agent Component**: .NET 6.0, C#, OpenCvSharp4.Windows, Windows APIs
- **Protocol**: WebSocket (ws://), JSON message format

---

## 7. Yêu cầu môi trường

- **Agent**: Windows OS, .NET 6.0 SDK/Runtime, quyền Administrator
- **Gateway**: Node.js v14+, npm
- **Web**: Python 3.7+, pip, Flask, trình duyệt web hỗ trợ WebSocket

---

