/**
 * errorHandler.js - Error Message Handler
 * Handles error responses from the server
 */

function handleErrorResponse(msg) {
    if (!msg.success) {
        logStatus("Lỗi: " + (msg.message || "Command failed"));
        
        // Delegate to specific error handlers
        handleKeylogError(msg);
        handleWebcamError(msg);
        handleScreenshotError(msg);
    }
}

