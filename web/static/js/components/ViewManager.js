/**
 * ViewManager.js - View Management Component
 * Handles switching between different views (table, media, keylog)
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

