# Gateway Component

## 1. Giới thiệu component

Gateway là server WebSocket trung gian, đóng vai trò router message giữa web client và agent.

**Vai trò:**

- Nhận kết nối từ web client (browser) và agent (máy client)
- Đăng ký và quản lý kết nối theo role (`web` hoặc `agent`)
- Định tuyến message hai chiều: web ↔ agent
- Xử lý keep-alive (ping/pong) để duy trì kết nối

**Giao tiếp:**

- **Web client**: Kết nối từ browser qua WebSocket
- **Agent**: Kết nối từ máy client (C# application) qua WebSocket

**Chạy ở đâu:**

- Server Node.js, chạy độc lập như một service
- Mặc định lắng nghe trên port 8080

## 2. Hướng dẫn cài đặt

### Phụ thuộc / Runtime:

- **Node.js** (version 14+)
- **npm** hoặc **yarn**

### Các bước cài đặt:

1. Cài đặt dependencies:

```bash
npm install
```

2. Cấu hình (tùy chọn):

   - Chỉnh sửa file `appsettings.json`
   - Mặc định: `host=0.0.0.0`, `port=8080`, `maxPayload=50MB`

3. Chạy server:

```bash
npm start
```

Server sẽ khởi động và lắng nghe trên `ws://localhost:8080` (hoặc theo cấu hình tùy chọn)

## 3. Luồng hoạt động (Workflow)

1. **Khởi tạo**: Server WebSocket khởi động, chờ kết nối
2. **Kết nối**: Client (web hoặc agent) kết nối đến gateway
3. **Đăng ký**: Client gửi message `register` với role (`web` hoặc `agent`)
4. **Xác thực**: Gateway xác nhận role và lưu connection vào ConnectionManager
5. **Routing**:
   - Message từ web → chuyển đến agent
   - Message từ agent → chuyển đến web
6. **Keep-alive**: Xử lý ping/pong để duy trì kết nối
7. **Đóng kết nối**: Khi client disconnect, gateway xóa connection khỏi manager

## 4. Giao thức & dữ liệu

### WebSocket Endpoint:

```
ws://localhost:8080
```

(hoặc theo cấu hình tùy chọn)

**Lưu ý:** Khi server khởi động, log sẽ hiển thị địa chỉ WebSocket động dựa trên cấu hình hiện tại.



### Ví dụ message:

**Web client đăng ký:**

```json
{ "type": "register", "role": "web" }
```

**Agent đăng ký:**

```json
{ "type": "register", "role": "agent" }
```

**Web gửi lệnh chụp màn hình:**

```json
{ "command": "TAKEPIC" }
```

**Agent phản hồi:**

```json
{
  "success": true,
  "format": "jpeg",
  "imageData": "iVBORw0KGgo..."
}
```

## 5. Các module / hàm chính

### `server.js`

- **Chức năng**: Entry point, khởi tạo WebSocket server
- **Trách nhiệm**: Tạo server instance, bind port, xử lý connection events

### `services/ConnectionManager.js`

- **Chức năng**: Quản lý state của các kết nối
- **Trách nhiệm**: Lưu trữ webClient và agentClient, cung cấp methods để register/get/remove clients

### `services/RegistrationService.js`

- **Chức năng**: Xử lý logic đăng ký client
- **Trách nhiệm**: Validate role, đăng ký client vào ConnectionManager, log kết quả

### `services/MessageRouter.js`

- **Chức năng**: Định tuyến message giữa web và agent
- **Trách nhiệm**: Xác định hướng routing (web→agent hoặc agent→web), forward message, log routing

### `handlers/WebSocketHandler.js`

- **Chức năng**: Quản lý lifecycle của WebSocket connection
- **Trách nhiệm**: Setup event handlers (message, error, close), gọi MessageHandler khi có message

### `handlers/MessageHandler.js`

- **Chức năng**: Xử lý và parse message
- **Trách nhiệm**: Parse JSON, xử lý registration, keep-alive, và routing

### `middleware/keepAlive.js`

- **Chức năng**: Xử lý ping/pong messages
- **Trách nhiệm**: Nhận ping, trả về pong để duy trì kết nối

### `utils/logger.js`

- **Chức năng**: Centralized logging
- **Trách nhiệm**: Cung cấp các method log (info, warning, error, success, routing, screenshot)

### `config/index.js`

- **Chức năng**: Cấu hình server
- **Trách nhiệm**: Định nghĩa host, port, maxPayload, hỗ trợ environment variables

## 6. Ghi chú riêng của component

### Giới hạn:

- Chỉ hỗ trợ 1 web client và 1 agent client đồng thời
- Nếu có client mới kết nối cùng role, sẽ thay thế client cũ
- Không có authentication/authorization
- Không có message queue nếu một bên chưa kết nối
- Max payload mặc định 50MB (có thể cấu hình)

### Lý do thiết kế:

- **Stateless routing**: Gateway chỉ forward message, không xử lý business logic
- **Simple architecture**: Tách biệt rõ ràng giữa connection management, registration, và routing
- **Keep-alive**: Ping/pong để tránh timeout trên các proxy/firewall
- **Single responsibility**: Mỗi module có một trách nhiệm cụ thể

### Những điểm cần cải tiến:

- Hỗ trợ nhiều agent clients (multi-agent)
- Message queue khi một bên chưa kết nối
- Authentication/authorization mechanism
- Metrics và monitoring
- Error recovery và reconnection handling
- Message validation và sanitization
- Rate limiting để tránh abuse
