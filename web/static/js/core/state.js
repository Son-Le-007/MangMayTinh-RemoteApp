/**
 * state.js - Global State Variables
 * All shared state used across the application
 */

let ws;
let isWebcamOn = false;
let isWaitingForWebcamFrame = false; // Track if we're waiting for first webcam frame to confirm it's working
let isWaitingForScreenshot = false; // Track if we're waiting for screenshot to be received
let currentListView = null; // Track current list view: 'LIST_APPS' or 'LIST_PROCESS'
let isKeyloggerActive = false; // Track keylogger state
let keylogAutoRefreshTimer = null; // Timer for auto-refresh keylog

