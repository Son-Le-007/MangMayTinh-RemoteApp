/**
 * handlers/index.js - Message Router
 * Routes incoming WebSocket messages to appropriate handlers
 */

// --- MESSAGE HANDLING ---
function handleServerMessage(msg) {
    // Handle API contract format responses: { success: true/false, message: "...", data: "...", type: "..." }
    
    // WEBCAM_FRAME messages don't have 'success' field, handle them first
    // Check for webcam frames (has 'frameData' field or 'type' === 'WEBCAM_FRAME')
    if (msg.hasOwnProperty('frameData') || (msg.type === 'WEBCAM_FRAME' && msg.frameData)) {
        handleWebcamFrame(msg);
        return;
    }
    
    // Check if this is an API contract response (has 'success' field)
    if (msg.hasOwnProperty('success')) {
        // Handle errors first
        if (!msg.success) {
            handleErrorResponse(msg);
            return;
        }
        
        // Success - handle specific API contract responses
        
        // PROCESS_LIST response
        if (msg.hasOwnProperty('processes') && Array.isArray(msg.processes)) {
            handleProcessList(msg);
            return;
        }
        
        // APPLICATION_LIST response
        if (msg.hasOwnProperty('applications') && Array.isArray(msg.applications)) {
            handleApplicationList(msg);
            return;
        }
        
        // TAKEPIC response
        if (msg.hasOwnProperty('imageData')) {
            handleScreenshotResponse(msg);
            return;
        }
        
        // KEYLOG_PRINT response (has 'data' field)
        if (msg.hasOwnProperty('data') && !msg.hasOwnProperty('frameData')) {
            handleKeylogPrint(msg);
            return;
        }
        
        // WEBCAM_START response
        handleWebcamStartResponse(msg);
        
        // WEBCAM_STOP response
        handleWebcamStopResponse(msg);
        
        // Generic success message for other commands
        if (msg.message) {
            logStatus("✓ " + msg.message);
        }
        return;
    }
    
    // If message doesn't have 'success' field, log it as unrecognized
    console.log("Tin nhắn không xác định (không có trường 'success'):", msg);
}

