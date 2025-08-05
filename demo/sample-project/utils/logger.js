/**
 * Logger utility for the DevMind Demo Project
 * Provides consistent logging throughout the application
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const accessLogPath = path.join(logsDir, 'access.log');
const errorLogPath = path.join(logsDir, 'error.log');

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Formats a log message
 * @param {string} level - The log level
 * @param {string} message - The log message
 * @param {Object} [data] - Additional data to log
 * @returns {string} - The formatted log message
 */
function formatLogMessage(level, message, data) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level}] ${message}`;
  
  if (data) {
    // This has a potential issue - circular references in objects will cause problems
    logMessage += ` ${JSON.stringify(data)}`;
  }
  
  return logMessage;
}

/**
 * Writes a log message to the console and file
 * @param {string} level - The log level
 * @param {string} message - The log message
 * @param {Object} [data] - Additional data to log
 */
function log(level, message, data) {
  const logMessage = formatLogMessage(level, message, data);
  
  // Log to console
  switch (level) {
    case LOG_LEVELS.ERROR:
      console.error(logMessage);
      break;
    case LOG_LEVELS.WARN:
      console.warn(logMessage);
      break;
    case LOG_LEVELS.INFO:
      console.info(logMessage);
      break;
    case LOG_LEVELS.DEBUG:
      console.debug(logMessage);
      break;
    default:
      console.log(logMessage);
  }
  
  // Log to file
  const logFile = level === LOG_LEVELS.ERROR ? errorLogPath : accessLogPath;
  
  // This has a potential issue - synchronous file I/O can block the event loop
  fs.appendFileSync(logFile, logMessage + '\n');
}

/**
 * Logs an error message
 * @param {string} message - The error message
 * @param {Error|Object} [error] - The error object
 */
function error(message, error) {
  log(LOG_LEVELS.ERROR, message, error);
}

/**
 * Logs a warning message
 * @param {string} message - The warning message
 * @param {Object} [data] - Additional data
 */
function warn(message, data) {
  log(LOG_LEVELS.WARN, message, data);
}

/**
 * Logs an info message
 * @param {string} message - The info message
 * @param {Object} [data] - Additional data
 */
function info(message, data) {
  log(LOG_LEVELS.INFO, message, data);
}

/**
 * Logs a debug message
 * @param {string} message - The debug message
 * @param {Object} [data] - Additional data
 */
function debug(message, data) {
  // Only log debug messages if DEBUG environment variable is set
  if (process.env.DEBUG) {
    log(LOG_LEVELS.DEBUG, message, data);
  }
}

module.exports = {
  error,
  warn,
  info,
  debug
};