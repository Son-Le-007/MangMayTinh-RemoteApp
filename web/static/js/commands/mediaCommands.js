/**
 * mediaCommands.js - Media Commands
 * Handles screenshot and webcam commands
 */

// Nút 3: Screenshot
function requestScreenshot() {
    // Clear old screenshot image and set waiting flag - DON'T switch view yet
    const screenshotImg = document.getElementById('monitor-img');
    if (screenshotImg) {
        screenshotImg.src = ''; // Clear old screenshot image
    }
    isWaitingForScreenshot = true;
    sendToGateway({ command: 'TAKEPIC' });
    logStatus("Đang yêu cầu chụp màn hình... Đợi nhận ảnh...");
}

// Nút 4: Webcam Toggle
function toggleWebcam() {
    switchView('view-media', 'Webcam Trực tiếp');
    
    if (!isWebcamOn) {
        // Bật Webcam - Clear old image and DON'T update UI yet, wait for first frame
        const webcamImg = document.getElementById('monitor-img');
        if (webcamImg) {
            webcamImg.src = ''; // Clear old screenshot image
        }
        isWaitingForWebcamFrame = true;
        sendToGateway({ command: 'WEBCAM_START', frameRate: 10 });
        logStatus("Đang bật Webcam... Đợi nhận frame đầu tiên...");
    } else {
        // Tắt Webcam - update UI immediately on button press
        isWebcamOn = false;
        isWaitingForWebcamFrame = false;
        updateWebcamButton();
        // Clear the image when stopping webcam
        const webcamImg = document.getElementById('monitor-img');
        if (webcamImg) {
            webcamImg.src = '';
        }
        sendToGateway({ command: 'WEBCAM_STOP' });
        logStatus("Đã gửi lệnh tắt Webcam.");
    }
}

// Update webcam button UI based on state
function updateWebcamButton() {
    const btn = document.getElementById('btn-webcam');
    if (!btn) return;
    
    if (isWebcamOn) {
        btn.innerText = "4. Tắt Webcam";
        btn.classList.remove('btn-info');
        btn.classList.add('btn-warning');
    } else {
        btn.innerText = "4. Bật Webcam";
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-info');
    }
}

