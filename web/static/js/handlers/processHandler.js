/**
 * processHandler.js - Process & Application Message Handler
 * Handles PROCESS_LIST and APPLICATION_LIST responses
 */

function handleProcessList(msg) {
    // PROCESS_LIST response
    if (msg.hasOwnProperty('processes') && Array.isArray(msg.processes)) {
        currentListView = 'LIST_PROCESS';
        // Convert API contract format to internal format
        const normalizedData = msg.processes.map(proc => ({
            pid: proc.processId,
            name: proc.name
        }));
        renderTable(normalizedData);
        switchView('view-table', 'Danh sách Tiến trình');
        logStatus(`✓ Nhận ${msg.count || msg.processes.length} tiến trình`);
    }
}

function handleApplicationList(msg) {
    // APPLICATION_LIST response
    if (msg.hasOwnProperty('applications') && Array.isArray(msg.applications)) {
        currentListView = 'LIST_APPS';
        // Convert API contract format to internal format
        const normalizedData = msg.applications.map(app => ({
            pid: app.processId,
            name: app.name
        }));
        renderTable(normalizedData);
        switchView('view-table', 'Danh sách Ứng dụng');
        logStatus(`✓ Nhận ${msg.count || msg.applications.length} ứng dụng`);
    }
}

