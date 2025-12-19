# Web Component - Remote Control Dashboard

## 1. Giới thiệu component

**Vai trò:** Web component là giao diện người dùng (UI) của hệ thống Remote Control, cho phép người dùng điều khiển máy client từ xa thông qua trình duyệt web.

**Giao tiếp:**
- **Gateway Server:** Kết nối WebSocket để gửi/nhận lệnh và dữ liệu
- **Agent (gián tiếp):** Thông qua Gateway, không kết nối trực tiếp

**Nơi chạy:**
- **Backend:** Python Flask server (chạy trên máy quản trị)
- **Frontend:** JavaScript chạy trên trình duyệt web của người dùng

## 2. Hướng dẫn cài đặt

### Phụ thuộc / Runtime:
- **Python 3.x**
- **Flask** (Python package)
- **Trình duyệt web** hỗ trợ WebSocket (Chrome, Firefox, Edge...)

### Các bước cài đặt:

1. **Cài đặt Python dependencies:**
   ```bash
   pip install flask
   ```

2. **Cấu hình Gateway URL:**
   - Mở file `appsettings.json` ở thư mục gốc

3. **Chạy server:**
   ```bash
   cd web
   python main.py
   ```

4. **Truy cập:**
   - Mở trình duyệt: `http://localhost:5000`
   - Dashboard sẽ tự động kết nối tới Gateway

## 3. Luồng hoạt động (Workflow)

1. **Khởi động:**
   - Flask server khởi động và serve trang `dashboard.html`
   - JavaScript load và khởi tạo WebSocket connection

2. **Đăng ký với Gateway:**
   - Gửi message `{ type: "register", role: "web" }` để xác định danh tính

3. **Gửi lệnh:**
   - Người dùng click button trên UI
   - JavaScript tạo JSON command theo API contract
   - Gửi qua WebSocket tới Gateway

4. **Nhận phản hồi:**
   - Gateway forward response từ Agent
   - Message router phân loại và gọi handler tương ứng
   - UI cập nhật hiển thị (bảng, hình ảnh, keylog...)

5. **Xử lý đặc biệt:**
   - **Webcam:** Nhận frame liên tục (streaming)
   - **Keylogger:** Auto-refresh định kỳ để hiển thị keystrokes mới

## 4. Giao thức & dữ liệu

### WebSocket Endpoint:
- Kết nối tới Gateway: `ws://localhost:8080` (mặc định)
- Cấu hình trong `appsettings.json`



### Ví dụ message:

**Request Process List:**
```json
{ "command": "PROCESS_LIST" }
```

**Response:**
```json
{
  "success": true,
  "count": 127,
  "processes": [
    { "name": "chrome", "processId": 1234, "threadCount": 45 }
  ]
}
```

**Webcam Frame (streaming):**
```json
{
  "type": "WEBCAM_FRAME",
  "format": "jpeg",
  "frameData": "base64_encoded_image..."
}
```

## 5. Các module / hàm chính

### Backend (Python):
- **`main.py`:** Flask server, route `/` render dashboard
- **`config.py`:** Load cấu hình Gateway URL và port từ `appsettings.json` hoặc env vars

### Frontend Core:
- **`core/websocket.js`:** Quản lý kết nối WebSocket, đăng ký với Gateway
- **`core/state.js`:** Biến global state (WebSocket instance, flags...)

### Components (UI Helpers):
- **`components/StatusLogger.js`:** Hiển thị status messages
- **`components/ViewManager.js`:** Quản lý chuyển đổi giữa các view (table/media/keylog)
- **`components/TableRenderer.js`:** Render bảng dữ liệu processes/apps

### Handlers (Message Processing):
- **`handlers/index.js`:** Message router, phân loại và route messages tới handler phù hợp
- **`handlers/processHandler.js`:** Xử lý PROCESS_LIST, APPLICATION_LIST responses
- **`handlers/mediaHandler.js`:** Xử lý screenshot (TAKEPIC) responses
- **`handlers/webcamHandler.js`:** Xử lý webcam frames và start/stop responses
- **`handlers/keylogHandler.js`:** Xử lý KEYLOG_PRINT responses
- **`handlers/errorHandler.js`:** Xử lý error responses

### Commands (User Actions):
- **`commands/processCommands.js`:** Functions cho process/app management (list, start, kill)
- **`commands/mediaCommands.js`:** Functions cho screenshot
- **`commands/keyloggerCommands.js`:** Functions cho keylogger (start, stop, clear)
- **`commands/systemCommands.js`:** Functions cho system commands (shutdown, restart)
- **`commands/stateManager.js`:** Quản lý state transitions

### Initialization:
- **`init.js`:** Khởi tạo WebSocket connection khi page load

## 6. Ghi chú riêng của component

### Giới hạn:
- Chỉ hỗ trợ 1 kết nối WebSocket tại một thời điểm
- Không có authentication/authorization (đã bỏ login)
- Không có cơ chế reconnect tự động khi mất kết nối
- Webcam streaming có thể lag nếu frame rate cao hoặc mạng chậm

### Lý do thiết kế:
- **Flask đơn giản:** Chỉ serve static HTML, không cần backend phức tạp
- **Client-side routing:** Tất cả logic xử lý ở JavaScript, giảm tải server
- **Modular structure:** Tách biệt handlers, commands, components để dễ maintain
- **API Contract:** Tuân thủ format chuẩn từ `api_contract.md` để đảm bảo tương thích

### Những điểm cần cải tiến:
- Thêm auto-reconnect khi WebSocket disconnect
- Thêm loading indicators khi đang chờ response
- Optimize webcam frame rendering (throttle, buffer)
- Thêm error recovery và retry mechanism
- Cải thiện UI/UX (responsive design, dark mode)
- Thêm validation cho user input trước khi gửi command

