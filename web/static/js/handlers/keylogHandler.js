/**
 * keylogHandler.js - Keylogger Message Handler
 * Handles KEYLOG_PRINT responses
 */

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

function handleKeylogError(msg) {
    // If keylogger command failed, revert state
    if (msg.message && (msg.message.includes("Keylog") || msg.message.includes("keylog"))) {
        isKeyloggerActive = false;
        updateKeylogButtons();
        if (keylogAutoRefreshTimer) {
            clearInterval(keylogAutoRefreshTimer);
            keylogAutoRefreshTimer = null;
        }
    }
}

