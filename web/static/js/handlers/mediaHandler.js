/**
 * mediaHandler.js - Media Message Handler
 * Handles screenshot (TAKEPIC) responses
 */

function handleScreenshotResponse(msg) {
    // TAKEPIC response
    if (msg.hasOwnProperty('imageData')) {
        // Switch to view-media only when screenshot is actually received
        if (isWaitingForScreenshot) {
            switchView('view-media', 'Ảnh chụp màn hình');
            isWaitingForScreenshot = false;
        }
        const img = document.getElementById('monitor-img');
        if (img && msg.imageData) {
            img.src = "data:image/" + (msg.format || "jpeg") + ";base64," + msg.imageData;
        }
        logStatus("✓ Đã nhận ảnh chụp màn hình");
    }
}

function handleScreenshotError(msg) {
    // If screenshot command failed, revert state
    if (msg.message && (msg.message.includes("Screenshot") || msg.message.includes("screenshot") || msg.message.includes("TAKEPIC"))) {
        // If TAKEPIC command failed, cancel waiting state
        isWaitingForScreenshot = false;
    }
}

