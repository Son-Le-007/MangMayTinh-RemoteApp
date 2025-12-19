/**
 * processCommands.js - Process & Application Commands
 * Handles commands for listing, starting, and killing processes/applications
 */

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

