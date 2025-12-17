/**
 * ui.js - UI Helper Functions
 * Handles view switching, table rendering, and status display
 */

// Chuyển đổi tab hiển thị (Table, Media, Text)
function switchView(viewId, title) {
    // Ẩn tất cả các view-section
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(el => el.classList.remove('active'));
    
    // Hiện view được chọn
    const selected = document.getElementById(viewId);
    if (selected) selected.classList.add('active');
    
    // Cập nhật tiêu đề
    const titleEl = document.getElementById('view-title');
    if (titleEl) titleEl.innerText = title;
}

// Vẽ bảng HTML từ dữ liệu JSON
function renderTable(dataArray) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    
    tbody.innerHTML = ""; // Xóa dữ liệu cũ

    if (!Array.isArray(dataArray) || dataArray.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3' style='text-align:center'>Không có dữ liệu hoặc danh sách trống</td></tr>";
        return;
    }

    dataArray.forEach(item => {
        // Tạo dòng tr
        const tr = document.createElement('tr');
        
        // Giả sử item = { pid: 1234, name: "chrome.exe" }
        // Cột ID
        const tdId = document.createElement('td');
        tdId.textContent = item.pid || "N/A";
        
        // Cột Tên
        const tdName = document.createElement('td');
        tdName.textContent = item.name || "Unknown";
        
        // Cột Hành động (Nút Kill)
        const tdAction = document.createElement('td');
        const btnKill = document.createElement('button');
        btnKill.className = 'btn-kill';
        btnKill.textContent = 'Stop/Kill';
        // Use currentListView to determine if this is for applications
        const isAppView = (currentListView === 'LIST_APPS');
        btnKill.onclick = function() { killProcess(item.pid, 'PID', isAppView); };
        
        tdAction.appendChild(btnKill);
        
        tr.appendChild(tdId);
        tr.appendChild(tdName);
        tr.appendChild(tdAction);
        
        tbody.appendChild(tr);
    });
}

// Hàm ghi log trạng thái nhỏ ở góc dưới menu
function logStatus(text) {
    const el = document.getElementById('status-log');
    if (el) {
        const time = new Date().toLocaleTimeString();
        el.innerText = `[${time}] ${text}`;
    }
}

