/**
 * StatusLogger.js - Status Logging Component
 * Handles status messages display
 */

// Hàm ghi log trạng thái nhỏ ở góc dưới menu
function logStatus(text) {
    const el = document.getElementById('status-log');
    if (el) {
        const time = new Date().toLocaleTimeString();
        el.innerText = `[${time}] ${text}`;
    }
}

