/**
 * systemCommands.js - System Commands
 * Handles system-level commands like restart and shutdown
 */

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

