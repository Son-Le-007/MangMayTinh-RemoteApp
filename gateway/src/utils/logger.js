/**
 * Centralized logging utility
 * Preserves exact log format from original implementation
 */

const log = {
  info: (message) => {
    console.log(`[INFO] ${message}`);
  },

  warning: (message) => {
    console.log(`[WARNING] ${message}`);
  },

  error: (message) => {
    console.error(`[ERROR] ${message}`);
  },

  success: (message) => {
    console.log(`[SUCCESS] ${message}`);
  },

  routing: (message) => {
    console.log(`[ROUTING] ${message}`);
  },

  screenshot: (message) => {
    console.log(`[SCREENSHOT] ${message}`);
  }
};

module.exports = log;

