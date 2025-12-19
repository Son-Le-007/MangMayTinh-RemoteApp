/**
 * websocket.js - WebSocket Connection
 * Handles connection to Gateway (message handling is in handlers/)
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

