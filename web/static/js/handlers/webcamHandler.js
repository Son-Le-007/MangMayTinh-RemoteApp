/**
 * webcamHandler.js - Webcam Message Handler
 * Handles WEBCAM_FRAME messages and webcam-related responses
 */

function handleWebcamFrame(msg) {
    const webcamImg = document.getElementById('monitor-img');
    if (webcamImg && msg.frameData) {
        const format = msg.format || "jpeg";
        webcamImg.src = "data:image/" + format + ";base64," + msg.frameData;
        
        // If we're waiting for the first frame, update UI state now
        if (isWaitingForWebcamFrame) {
            isWebcamOn = true;
            isWaitingForWebcamFrame = false;
            updateWebcamButton();
            logStatus("✓ Webcam đã bật và đang hoạt động!");
        }
    }
}

function handleWebcamStartResponse(msg) {
    // WEBCAM_START response - don't update UI here, wait for first frame
    if (msg.message && (msg.message.includes("Webcam streaming started") || msg.message.includes("Webcam streaming"))) {
        // Don't update UI state yet - wait for first frame to confirm it's working
        logStatus("✓ " + msg.message + " - Đợi frame đầu tiên...");
    }
}

function handleWebcamStopResponse(msg) {
    // WEBCAM_STOP response - UI already updated on button press, just confirm
    if (msg.message && (msg.message.includes("Webcam streaming stopped") || msg.message.includes("Webcam stopped"))) {
        // UI already updated optimistically, just log confirmation
        logStatus("✓ " + msg.message);
    }
}

function handleWebcamError(msg) {
    // If webcam command failed, revert state
    if (msg.message && (msg.message.includes("Webcam") || msg.message.includes("webcam"))) {
        // If START command failed, we were waiting for frame - cancel that
        isWebcamOn = false;
        isWaitingForWebcamFrame = false;
        updateWebcamButton();
    }
}

