/**
 * init.js - Application Initialization
 * Initializes the application after all scripts are loaded
 */

// Khởi chạy sau khi load xong tất cả file JS
window.onload = function () {
    initWebSocket(GATEWAY_CONFIG);
    // Initialize webcam button state
    updateWebcamButton();
    // Initialize automatic webcam turn-off on other button clicks
    initWebcamAutoOff();
};

