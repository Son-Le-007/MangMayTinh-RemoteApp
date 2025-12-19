/**
 * TableRenderer.js - Table Rendering Component
 * Handles rendering of process/application tables
 */

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

