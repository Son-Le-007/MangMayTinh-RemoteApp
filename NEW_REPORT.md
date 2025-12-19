# Remote App System - Báo Cáo Đồ Án

## 1. Giới thiệu hệ thống

**Remote App** là hệ thống điều khiển máy tính từ xa được thiết kế để giải quyết bài toán quản lý và giám sát máy tính trong môi trường doanh nghiệp hoặc giáo dục. Hệ thống cho phép quản trị viên thực hiện các thao tác như chụp màn hình, quản lý tiến trình, giám sát webcam, ghi nhận phím bấm và điều khiển hệ thống từ xa mà không cần có mặt trực tiếp tại máy client.

**Đối tượng sử dụng:** Quản trị viên hệ thống, IT support, giáo viên quản lý phòng máy tính.

**Mục tiêu:** Xây dựng một hệ thống real-time, ổn định, có khả năng tự động kết nối lại khi mất kết nối, và hoạt động được trong môi trường có firewall/NAT thông qua kết nối outbound từ Agent.

---

## 2. Kiến trúc hệ thống

### 2.1. Tổng quan kiến trúc

Hệ thống được xây dựng theo mô hình **3 tầng** với giao tiếp real-time qua giao thức **WebSocket**, cho phép trao đổi dữ liệu hai chiều giữa Web Client và Agent thông qua Gateway trung gian.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web Component                           │
│  ┌──────────────┐         ┌──────────────┐   ┌─────────────┐  │ │
│  │ Flask Server │         │   Browser    │   │ JavaScript  │  │ │
│  │  (Python)    │◄───────►│   Client     │◄──│  WebSocket  │  │ │
│  └──────────────┘         └──────────────┘   └─────────────┘  │ │
└─────────────────────────────────────────────────────────────────┘
                              │ WebSocket (ws://)
                              │ JSON Messages
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Gateway Component                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              WebSocket Server (Node.js)                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │  │
│  │  │ Connection   │  │ Registration │  │   Message    │     │  │
│  │  │  Manager     │  │   Service    │  │   Router     │     │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │ WebSocket (ws://)
                              │ JSON Messages
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Agent Component                          │
│  ┌──────────────┐         ┌──────────────┐   ┌─────────────┐    │
│  │   Program    │         │   Server     │   │   API       │    │
│  │   Entry      │────────►│  Refactor    │──►│  Handlers   │    │
│  └──────────────┘         └──────────────┘   └─────────────┘    │
│                                 │                               │
│                    ┌────────────┴────────────┐                  │
│                    │                         │                  │
│            ┌───────▼──────┐         ┌────────▼────────┐         │
│            │  Windows     │         │   OpenCvSharp   │         │
│            │    APIs      │         │   (Webcam)      │         │
│            └──────────────┘         └─────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2. Đặc điểm kiến trúc

**1. Kết nối Outbound từ Agent:**

- Agent tự động kết nối tới Gateway (outbound connection)
- Giải quyết vấn đề firewall/NAT: Agent không cần mở port, chỉ cần Gateway có thể truy cập từ internet
- Agent có thể nằm sau NAT router mà vẫn hoạt động được

**2. Gateway làm trung gian:**

- Gateway quản lý 2 kết nối độc lập: một từ Web Client, một từ Agent
- Gateway định tuyến message dựa trên role (`web` hoặc `agent`)
- Gateway không lưu trữ state, chỉ forward message

**3. Giao thức WebSocket:**

- Full-duplex communication: có thể gửi/nhận đồng thời
- Low latency: phù hợp cho real-time streaming (webcam, screenshot)
- Persistent connection: giảm overhead so với HTTP polling

**4. Message Format:**

- Tất cả message đều là JSON
- Request: `{ "command": "COMMAND_NAME", ... }`
- Response: `{ "success": true/false, "message": "...", "data": ... }`

### 2.3. Vai trò các thành phần

**Web Component (Python Flask + JavaScript):**

- **Vai trò:** Giao diện người dùng, nhận lệnh từ user và hiển thị kết quả
- **Trách nhiệm:**
  - Render dashboard HTML/CSS
  - Kết nối WebSocket tới Gateway
  - Gửi commands từ user
  - Nhận và hiển thị responses (bảng, hình ảnh, keylog...)
- **Công nghệ:** Flask (Python), Vanilla JavaScript (ES6+), Native WebSocket API

**Gateway Component (Node.js):**

- **Vai trò:** Server trung gian, quản lý kết nối và định tuyến message
- **Trách nhiệm:**
  - Lắng nghe WebSocket connections từ Web và Agent
  - Xác thực và đăng ký clients (role-based)
  - Định tuyến message hai chiều (Web ↔ Agent)
  - Xử lý keep-alive (ping/pong) để duy trì kết nối
- **Công nghệ:** Node.js, WebSocket library `ws`

**Agent Component (C# .NET):**

- **Vai trò:** Thực thi lệnh trên máy client Windows
- **Trách nhiệm:**
  - Kết nối outbound tới Gateway
  - Nhận và parse commands từ Gateway
  - Thực thi lệnh thông qua Windows APIs
  - Gửi response về Gateway
  - Tự động reconnect khi mất kết nối
- **Công nghệ:** .NET 6.0, C#, OpenCvSharp4.Windows, Windows APIs

---

## 3. Luồng hoạt động chi tiết

### 3.1. Luồng khởi động hệ thống

**Bước 1: Gateway khởi động**

```
1. Gateway server khởi động, bind port 8080
2. WebSocket server lắng nghe connections
3. Sẵn sàng nhận kết nối từ Web và Agent
```

**Bước 2: Agent kết nối và đăng ký**

```
1. Agent đọc cấu hình Gateway URL từ appsettings.json
2. Agent tạo ClientWebSocket và kết nối tới Gateway (outbound)
3. Agent gửi registration message: { "type": "register", "role": "agent" }
4. Gateway xác thực role và lưu agentClient vào ConnectionManager
5. Nếu registration thành công, connection được giữ lại
6. Agent bắt đầu StartListeningAsync() để nhận messages
```

**Bước 3: Web Client kết nối và đăng ký**

```
1. User mở trình duyệt, truy cập Flask server (localhost:5000)
2. Flask render dashboard.html với Gateway URL
3. JavaScript initWebSocket() tạo WebSocket connection tới Gateway
4. Web Client gửi registration message: { "type": "register", "role": "web" }
5. Gateway xác thực và lưu webClient vào ConnectionManager
6. Web Client sẵn sàng gửi commands
```

### 3.2. Luồng xử lý lệnh (Command Flow)

**Scenario: User muốn chụp màn hình (TAKEPIC)**

```
┌────────┐                    ┌─────────┐                      ┌─────────┐
│  Web   │                    │ Gateway │                      │  Agent  │
│ Client │                    │         │                      │         │
└───┬────┘                    └─────┬───┘                      └────┬────┘
    │                               │                               │
    │ 1. User click "Chụp màn hình" │                               │
    │                               │                               │
    │ 2. sendToGateway({            │                               │
    │      command: "TAKEPIC"       │                               │
    │    })                         │                               │
    ├──────────────────────────────►│                               │
    │                               │                               │
    │                               │ 3. MessageHandler.handle()    │
    │                               │    - Parse JSON               │
    │                               │    - Check registration       │
    │                               │                               │
    │                               │ 4. MessageRouter.route()      │
    │                               │    - Identify source: web     │
    │                               │    - Get agentClient          │
    │                               │    - Forward to agent         │
    │                               ├──────────────────────────────►│
    │                               │                               │
    │                               │                               │ 5. StartListeningAsync()
    │                               │                               │    nhận message
    │                               │                               │
    │                               │                               │ 6. HandleMessageAsync()
    │                               │                               │    - Parse JSON
    │                               │                               │    - Extract command
    │                               │                               │
    │                               │                               │ 7. Switch case "TAKEPIC"
    │                               │                               │    → screenshotHandler
    │                               │                               │      .TakePictureAsync()
    │                               │                               │
    │                               │                               │ 8. ScreenshotHandler:
    │                               │                               │    - Capture screen (Windows API)
    │                               │                               │    - Convert to JPEG
    │                               │                               │    - Encode base64
    │                               │                               │    - Return response object
    │                               │                               │
    │                               │                               │ 9. SendJsonResponseAsync()
    │                               │                               │    - Serialize to JSON
    │                               │                               │    - Send via WebSocket
    │                               │                               │
    │                               │ 10. MessageRouter.route()     │
    │                               │     - Identify source: agent  │
    │                               │     - Get webClient           │
    │                               │     - Forward to web          │
    │                               │◄──────────────────────────────┤
    │                               │                               │
    │ 11. ws.onmessage()            │                               │
    │     - Parse JSON response     │                               │
    │                               │                               │
    │ 12. handleServerMessage()     │                               │
    │     - Check has imageData     │                               │
    │     - Call handleScreenshotResponse()                         │
    │                               │                               │
    │ 13. Update UI:                │                               │
    │     - Decode base64 image     │                               │
    │     - Display in <img> tag    │                               │
    │                               │                               │
```

**Chi tiết các bước quan trọng:**

**Bước 3-4 (Gateway - Message Routing):**

- `MessageHandler.handle()` nhận raw message từ WebSocket
- Kiểm tra nếu là ping/pong → xử lý keep-alive
- Parse JSON và kiểm tra registration
- Gọi `MessageRouter.route()` để forward message

**Bước 6-7 (Agent - Command Dispatch):**

- `StartListeningAsync()` đọc message từ WebSocket buffer
- Gọi `HandleMessageAsync()` để parse và route command
- Switch-case dựa trên `command` field để gọi handler tương ứng

**Bước 8 (Agent - Command Execution):**

- Handler thực thi lệnh (ví dụ: chụp màn hình)
- Tạo response object theo API contract
- Trả về response object

**Bước 9-10 (Agent → Gateway → Web):**

- Agent serialize response thành JSON và gửi qua WebSocket
- Gateway nhận message từ Agent, route tới Web Client
- Web Client nhận và xử lý response

### 3.3. Luồng Webcam Streaming (Continuous Flow)

Webcam streaming khác với các lệnh thông thường vì nó gửi frames liên tục:

```
1. Web Client gửi: { "command": "WEBCAM_START", "frameRate": 10 }
2. Agent nhận và khởi động WebcamHandler:
   - Tạo VideoCapture object (OpenCvSharp)
   - Khởi động Timer với interval = 1000/frameRate
   - Timer callback: CaptureWebcamFrameAsync()
3. Mỗi lần timer tick:
   - Capture frame từ webcam
   - Encode JPEG với quality 85%
   - Convert to base64
   - Gửi message: { "type": "WEBCAM_FRAME", "format": "jpeg", "frameData": "..." }
4. Gateway forward frame messages tới Web Client
5. Web Client nhận và hiển thị frame trong <img> tag
6. Quá trình lặp lại cho đến khi nhận WEBCAM_STOP
```

**Đặc điểm:**

- Frames được gửi không đồng bộ (không phải response của request)
- Web Client phải xử lý message type `WEBCAM_FRAME` riêng
- Agent sử dụng callback pattern để gửi frames qua WebSocket

### 3.4. Luồng Keep-Alive và Reconnection

**Keep-Alive (Duy trì kết nối):**

```
1. Agent: KeepaliveLoopAsync() gửi "ping" mỗi 30 giây
2. Gateway: KeepAliveHandler nhận "ping", gửi "pong" về
3. Nếu không nhận ping/pong trong thời gian dài → connection timeout
```

**Reconnection (Tự động kết nối lại):**

```
1. Agent phát hiện mất kết nối (WebSocket state != Open)
2. ConnectionLoopAsync() catch exception
3. Cleanup: Dispose WebSocket, stop handlers
4. Đợi 5 giây
5. Gọi lại ConnectToGatewayAsync() để kết nối lại
6. Lặp lại cho đến khi kết nối thành công hoặc app bị tắt
```

---

## 4. Phân tích các thành phần trọng yếu

### 4.1. Agent Component - Program.cs

**Vai trò:** Entry point và quản lý vòng đời kết nối của Agent.

**Các hàm quan trọng:**

#### `MainAsync()` - Khởi tạo và cấu hình

```csharp
static async Task MainAsync()
```

**Chức năng:**

- Load cấu hình từ `appsettings.json` (Gateway URL)
- Thiết lập Ctrl+C handler để shutdown gracefully
- Khởi động `ConnectionLoopAsync()` trong background task
- Giữ application running cho đến khi nhận cancellation signal

**Phân tích:**

- Sử dụng `ConfigurationBuilder` để load JSON config → tách biệt config khỏi code
- Background task cho phép app tiếp tục chạy trong khi connection loop hoạt động
- Graceful shutdown: đợi cancellation token thay vì force exit

#### `ConnectionLoopAsync()` - Vòng lặp kết nối và tự động reconnect

```csharp
static async Task ConnectionLoopAsync(string gatewayUrl, CancellationToken cancellationToken)
```

**Chức năng:**

- Vòng lặp vô hạn cố gắng kết nối tới Gateway
- Nếu kết nối thành công → khởi động `ServerRefactor.StartListeningAsync()`
- Nếu mất kết nối → cleanup và đợi 5 giây trước khi reconnect
- Tiếp tục cho đến khi nhận cancellation (Ctrl+C)

**Phân tích:**

- **Resilience:** Tự động reconnect đảm bảo Agent luôn cố gắng kết nối lại
- **Error handling:** Mỗi lần lặp được wrap trong try-catch để tránh crash
- **Resource cleanup:** Dispose WebSocket và ServerRefactor khi mất kết nối
- **Delay 5 giây:** Tránh spam connection attempts, giảm tải Gateway

**Luồng hoạt động:**

```
while (!cancelled) {
    try {
        if (ConnectToGatewayAsync()) {
            serverRefactor = new ServerRefactor();
            await serverRefactor.StartListeningAsync();
            // Nếu đến đây → connection lost
        }
        // Cleanup
    } catch {
        // Handle error
    }
    await Task.Delay(5000); // Wait before reconnect
}
```

#### `ConnectToGatewayAsync()` - Thiết lập kết nối WebSocket

```csharp
static async Task<bool> ConnectToGatewayAsync(string gatewayUrl)
```

**Chức năng:**

- Tạo `ClientWebSocket` và kết nối tới Gateway URL
- Gửi registration message: `{ "type": "register", "role": "agent" }`
- Đợi 1.5 giây để Gateway xử lý registration
- Kiểm tra connection state: nếu vẫn Open → registration thành công

**Phân tích:**

- **Outbound connection:** Agent là client, kết nối tới Gateway → vượt qua firewall/NAT
- **Registration verification:** Đợi và kiểm tra state thay vì nhận explicit response
  - Nếu Gateway reject (invalid role) → đóng connection
  - Nếu Gateway accept → giữ connection open
- **Timeout:** Connection timeout 10 giây, send timeout 5 giây → tránh hang

### 4.2. Agent Component - server.cs (ServerRefactor)

**Vai trò:** Message router và WebSocket listener, trung tâm xử lý commands từ Gateway.

**Các hàm quan trọng:**

#### `StartListeningAsync()` - WebSocket receive loop

```csharp
public async Task StartListeningAsync(ClientWebSocket ws)
```

**Chức năng:**

- Vòng lặp nhận messages từ WebSocket cho đến khi connection đóng
- Xử lý message fragments (WebSocket có thể chia message thành nhiều fragments)
- Accumulate fragments cho đến khi `EndOfMessage = true`
- Parse message và gọi `HandleMessageAsync()`
- Xử lý keep-alive ping/pong messages
- Khởi động `KeepaliveLoopAsync()` trong background task

**Phân tích:**

- **Message fragmentation:** WebSocket có thể chia message lớn thành nhiều frames
  - Cần accumulate fragments trong `messageBuilder` cho đến khi `EndOfMessage = true`
  - Đảm bảo nhận đầy đủ message trước khi parse JSON
- **Error isolation:** Mỗi message được wrap trong try-catch riêng
  - Nếu một message lỗi → log error và tiếp tục nhận message khác
  - Tránh một bad message làm crash toàn bộ listener
- **Keep-alive:** Ping/pong được xử lý trước khi parse JSON
  - Tránh lỗi JSON parse cho ping/pong messages
- **Resource management:** Cleanup handlers khi connection đóng

**Luồng nhận message:**

```
while (connection open) {
    do {
        result = await ReceiveAsync(buffer);
        if (result.MessageType == Text) {
            messageBuilder.AddRange(buffer);
        }
    } while (!result.EndOfMessage);

    message = UTF8.GetString(messageBuilder);
    if (message == "ping" || message == "pong") {
        continue; // Ignore keep-alive
    }
    await HandleMessageAsync(message);
}
```

#### `HandleMessageAsync()` - Command dispatcher

```csharp
public async Task HandleMessageAsync(ClientWebSocket ws, string messageJson)
```

**Chức năng:**

- Parse JSON message và extract `command` field
- Switch-case dựa trên command để gọi handler tương ứng
- Wrap handler call trong try-catch để tránh crash
- Serialize response và gửi về Gateway

**Phân tích:**

- **Command routing:** Mỗi command được map tới một handler cụ thể
  - Keylogger: `KeyloggerHandler`
  - System: `SystemHandler`
  - Screenshot: `ScreenshotHandler`
  - Process: `ProcessHandler`
  - Application: `ApplicationHandler`
  - Webcam: `WebcamHandler`
- **Error handling:** Mỗi handler được wrap trong try-catch
  - Nếu handler throw exception → gửi error response thay vì crash
  - Đảm bảo một lệnh lỗi không ảnh hưởng đến các lệnh khác
- **Response format:** Tất cả responses đều theo API contract
  - Success: `{ "success": true, ... }`
  - Error: `{ "success": false, "message": "..." }`

**Ví dụ routing:**

```csharp
switch (command) {
    case "TAKEPIC":
        response = await screenshotHandler.TakePictureAsync();
        break;
    case "PROCESS_LIST":
        response = await processHandler.GetProcessListAsync();
        break;
    // ...
}
```

#### `KeepaliveLoopAsync()` - Duy trì kết nối

```csharp
private async Task KeepaliveLoopAsync(CancellationToken cancellationToken)
```

**Chức năng:**

- Gửi "ping" message mỗi 30 giây
- Kiểm tra WebSocket state trước khi gửi
- Nếu ping fail → break loop (connection likely dead)

**Phân tích:**

- **Purpose:** Giữ connection alive, tránh timeout từ proxy/firewall
- **Interval 30 giây:** Balance giữa network traffic và connection stability
- **Failure detection:** Nếu ping fail → connection đã chết, break để trigger reconnection

### 4.3. Gateway Component - MessageRouter.js

**Vai trò:** Định tuyến messages giữa Web Client và Agent.

**Hàm quan trọng:**

#### `route()` - Message routing logic

```javascript
route(ws, msg, data);
```

**Chức năng:**

- Xác định nguồn message (web hoặc agent) bằng cách so sánh WebSocket reference
- Nếu từ web → forward tới agent
- Nếu từ agent → forward tới web
- Log warning nếu destination không tồn tại

**Phân tích:**

- **Reference equality:** Sử dụng `ws === webClient` để xác định nguồn
  - Đảm bảo chính xác vì mỗi connection có một WebSocket instance duy nhất
- **Bidirectional routing:** Gateway không cần biết nội dung message
  - Chỉ cần biết nguồn → forward tới đích còn lại
  - Đơn giản và hiệu quả
- **Error handling:** Kiểm tra destination tồn tại trước khi forward
  - Nếu web gửi nhưng agent chưa kết nối → log warning
  - Tránh crash khi một client chưa kết nối

**Luồng routing:**

```
if (ws === webClient && agentClient exists) {
    agentClient.send(msg);  // Web → Agent
} else if (ws === agentClient && webClient exists) {
    webClient.send(msg);    // Agent → Web
} else {
    log warning;  // Destination not available
}
```

### 4.4. Gateway Component - ConnectionManager.js

**Vai trò:** Quản lý state của các WebSocket connections.

**Các hàm quan trọng:**

#### `registerClient()` - Đăng ký client

```javascript
registerClient(role, ws);
```

**Chức năng:**

- Lưu WebSocket instance vào `webClient` hoặc `agentClient` dựa trên role
- Trả về `true` nếu thay thế connection cũ (replaced)

**Phân tích:**

- **Single client per role:** Mỗi role chỉ có một connection active
  - Nếu client mới kết nối → thay thế client cũ
  - Đảm bảo routing chính xác (không có duplicate)
- **State management:** Lưu trữ WebSocket references để routing
  - `webClient`: Web Client connection
  - `agentClient`: Agent connection

#### `removeClient()` - Xóa client khi disconnect

```javascript
removeClient(ws);
```

**Chức năng:**

- Xóa WebSocket reference khi client disconnect
- Đảm bảo routing không forward tới connection đã đóng

**Phân tích:**

- **Cleanup:** Khi WebSocket đóng, cần xóa reference
  - Tránh memory leak
  - Tránh routing tới connection đã chết

### 4.5. Gateway Component - MessageHandler.js

**Vai trò:** Xử lý và phân loại incoming messages.

**Hàm quan trọng:**

#### `handle()` - Message processing pipeline

```javascript
handle(ws, msg);
```

**Chức năng:**

- Convert message to string
- Kiểm tra nếu là ping/pong → xử lý keep-alive
- Parse JSON
- Kiểm tra nếu là registration → xử lý đăng ký
- Nếu không → route message

**Phân tích:**

- **Processing order:** Xử lý theo thứ tự ưu tiên
  1. Keep-alive (ping/pong) → không cần parse JSON
  2. Registration → cần parse JSON để lấy role
  3. Normal message → route
- **Error handling:** JSON parse được wrap trong try-catch
  - Nếu parse fail → log error và ignore message
  - Tránh crash khi nhận invalid JSON

**Pipeline:**

```
msg → string
  → Is ping/pong? → KeepAliveHandler
  → Parse JSON
  → Is registration? → RegistrationService
  → Otherwise → MessageRouter.route()
```

### 4.6. Web Component - websocket.js

**Vai trò:** Quản lý WebSocket connection từ Web Client tới Gateway.

**Hàm quan trọng:**

#### `initWebSocket()` - Khởi tạo WebSocket connection

```javascript
function initWebSocket(gatewayUrl)
```

**Chức năng:**

- Tạo WebSocket instance và kết nối tới Gateway
- Setup event handlers: `onopen`, `onmessage`, `onclose`, `onerror`
- Gửi registration message khi connection mở
- Parse và route incoming messages tới `handleServerMessage()`

**Phân tích:**

- **Event-driven:** Sử dụng WebSocket events thay vì polling
  - `onopen`: Khi kết nối thành công → gửi registration
  - `onmessage`: Khi nhận message → parse JSON và xử lý
  - `onclose`: Khi mất kết nối → thông báo user
  - `onerror`: Khi có lỗi → log và thông báo
- **Registration:** Gửi ngay sau khi connection mở
  - Gateway cần biết role để routing
  - Không thể gửi commands trước khi đăng ký

#### `sendToGateway()` - Gửi commands

```javascript
function sendToGateway(payload)
```

**Chức năng:**

- Kiểm tra WebSocket state (phải là OPEN)
- Serialize payload thành JSON và gửi
- Log command để debug

**Phân tích:**

- **State check:** Đảm bảo connection đang mở trước khi gửi
  - Tránh lỗi khi connection đã đóng
  - Thông báo user nếu chưa kết nối

### 4.7. Web Component - handlers/index.js

**Vai trò:** Message router phía client, phân loại và xử lý responses từ Agent.

**Hàm quan trọng:**

#### `handleServerMessage()` - Client-side message router

```javascript
function handleServerMessage(msg)
```

**Chức năng:**

- Phân loại message dựa trên structure (fields)
- Route tới handler tương ứng:
  - `frameData` → webcam frame handler
  - `success: false` → error handler
  - `processes` array → process list handler
  - `applications` array → application list handler
  - `imageData` → screenshot handler
  - `data` field → keylog handler

**Phân tích:**

- **Content-based routing:** Phân loại dựa trên message structure, không phải command
  - Agent gửi response với structure khác nhau
  - Client cần identify response type để xử lý đúng
- **Priority order:** Xử lý theo thứ tự ưu tiên
  1. Webcam frames (không có `success` field)
  2. Error responses (`success: false`)
  3. Success responses với data cụ thể
- **Handler separation:** Mỗi loại response có handler riêng
  - `handleProcessList()`: Render bảng processes
  - `handleScreenshotResponse()`: Hiển thị ảnh
  - `handleWebcamFrame()`: Update webcam image
  - `handleKeylogPrint()`: Hiển thị keylog text

**Routing logic:**

```
if (has frameData) → webcam frame
else if (success === false) → error
else if (has processes) → process list
else if (has applications) → application list
else if (has imageData) → screenshot
else if (has data) → keylog
else → generic success message
```

---

## 5. Các tính năng chính

### 5.1. Quản lý Process & Application

**Process Management:**

- **PROCESS_LIST:** Liệt kê tất cả processes đang chạy (PID, name, thread count)
- **PROCESS_KILL:** Dừng process theo Process ID
- **PROCESS_START:** Khởi động process mới

**Application Management:**

- **APPLICATION_LIST:** Liệt kê các ứng dụng Windows có cửa sổ (MainWindowTitle > 0)
- **APPLICATION_KILL:** Đóng ứng dụng theo PID
- **APPLICATION_START:** Mở ứng dụng mới

**Implementation:** Sử dụng `System.Diagnostics.Process` API để query và control processes.

### 5.2. Screenshot

**TAKEPIC:** Chụp màn hình máy client và trả về ảnh JPEG base64-encoded.

**Implementation:**

- Sử dụng Windows GDI+ API để capture primary screen
- Convert sang JPEG format với compression
- Encode base64 để gửi qua JSON
- Web Client decode và hiển thị trong `<img>` tag

### 5.3. Webcam Streaming

**WEBCAM_START/WEBCAM_STOP:** Bật/tắt webcam streaming với frame rate có thể cấu hình.

**Implementation:**

- Sử dụng OpenCvSharp4.Windows (`VideoCapture`) để capture frames
- Timer-based capture: mỗi frame được capture theo interval (1000/frameRate ms)
- Frames được encode JPEG (quality 85%) và convert base64
- Gửi liên tục qua WebSocket với message type `WEBCAM_FRAME`
- Web Client nhận và update `<img>` tag real-time

**Đặc điểm:**

- Asynchronous streaming: frames được gửi không đồng bộ (không phải response)
- Callback pattern: Agent sử dụng callback để gửi frames qua WebSocket
- Resource management: Release webcam device khi stop

### 5.4. Keylogger

**KEYLOG_HOOK/KEYLOG_UNHOOK/KEYLOG_PRINT:** Bật/tắt keylogger và đọc keystrokes.

**Implementation:**

- Sử dụng Windows Hook API (`SetWindowsHookEx`) để intercept keyboard events
- Keylogger thread chạy liên tục trong background
- State control: enable/disable logging thông qua flag
- Ghi log vào file `fileKeyLog.txt`
- `KEYLOG_PRINT` đọc file, trả về content, và clear file

**Đặc điểm:**

- Thread-based: Keylogger chạy trong separate thread
- File-based storage: Log được ghi vào file, đọc khi cần
- State management: Có thể bật/tắt mà không cần restart thread

### 5.5. System Control

**SHUTDOWN/RESTART:** Tắt máy hoặc khởi động lại máy client.

**Implementation:**

- Sử dụng Windows `shutdown.exe` command với flags:
  - `-s`: Shutdown
  - `-r`: Restart
- Yêu cầu quyền Administrator
- Immediate action, không có confirmation dialog

---

## 6. Công nghệ sử dụng

### 6.1. Web Component

- **Backend:** Python 3.7+, Flask (web server)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **WebSocket:** Native WebSocket API (browser built-in)

### 6.2. Gateway Component

- **Runtime:** Node.js v14+
- **WebSocket:** `ws` library
- **Architecture:** Event-driven, single-threaded

### 6.3. Agent Component

- **Runtime:** .NET 6.0
- **Language:** C#
- **Libraries:**
  - `OpenCvSharp4.Windows`: Webcam capture
  - Windows APIs: Process management, screenshot, keylogger, system control

### 6.4. Protocol & Format

- **Protocol:** WebSocket (ws://)
- **Message Format:** JSON
- **Encoding:** UTF-8 for text, Base64 for binary data (images)

---

## 7. Yêu cầu môi trường

### 7.1. Agent

- **OS:** Windows (Windows 10/11)
- **Runtime:** .NET 6.0 SDK hoặc Runtime
- **Permissions:** Quyền Administrator (cho system commands)
- **Hardware:** Webcam (nếu sử dụng webcam streaming)

### 7.2. Gateway

- **Runtime:** Node.js v14+
- **Package Manager:** npm
- **Network:** Port 8080 phải accessible từ internet (nếu Agent ở xa)

### 7.3. Web

- **Runtime:** Python 3.7+
- **Package Manager:** pip
- **Browser:** Trình duyệt hỗ trợ WebSocket (Chrome, Firefox, Edge, Safari)

---

## 8. Kết luận

Hệ thống **Remote App** đã được thiết kế và triển khai thành công với kiến trúc 3 tầng sử dụng WebSocket protocol. Hệ thống đạt được các mục tiêu:

1. **Real-time communication:** WebSocket cho phép trao đổi dữ liệu hai chiều với độ trễ thấp
2. **Resilience:** Agent tự động reconnect khi mất kết nối
3. **Firewall/NAT traversal:** Outbound connection từ Agent giải quyết vấn đề firewall
4. **Modularity:** Mỗi component có trách nhiệm rõ ràng, dễ maintain và extend
5. **Error handling:** Comprehensive error handling đảm bảo stability

Hệ thống có thể được mở rộng thêm các tính năng như:

- Authentication và authorization
- Multi-agent support (nhiều Agent kết nối cùng lúc)
- Command history và logging
- Encrypted communication (WSS)
- Mobile client support
