/**
* global-utils.js
*
* Contains global utility functions for logging, time formatting, and duration parsing.
*/

// Global Debug Mode constant
const DEBUG_MODE = true; // Set to false for production to reduce console logs

/**
* Logs a message to the console if DEBUG_MODE is true.
* @param {string} message - The main message to log.
* @param {...any} args - Additional arguments to log.
*/
function logDebug(message, ...args) {
if (DEBUG_MODE) {
console.log(`[DEBUG] ${message}`, ...args);
}
}

/**
* Logs a warning message to the console.
* @param {string} message - The main warning message.
* @param {...any} args - Additional arguments to log.
*/
function logWarn(message, ...args) {
console.warn(`[WARN] ${message}`, ...args);
}

/**
* Logs an error message to the console.
* @param {string} message - The main error message.
* @param {...any} args - Additional arguments to log.
*/
function logError(message, ...args) {
console.error(`[ERROR] ${message}`, ...args);
}

/**
* Formats an ISO 8601 duration string (e.g., "PT1H30M15S") into "H:MM:SS" or "MM:SS".
* @param {string} isoDuration - The ISO 8601 duration string.
* @returns {string} The formatted duration string.
*/
function formatDuration(isoDuration) {
if (!isoDuration) {
logWarn("formatDuration: isoDuration is undefined or null, returning '00:00'.");
return "00:00";
}
const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
if (!match) {
logWarn("formatDuration: Invalid isoDuration format:", isoDuration, "returning '00:00'.");
return "00:00";
}
const hours = parseInt(match[1]) || 0;
const minutes = parseInt(match[2]) || 0;
const seconds = parseInt(match[3]) || 0;

let formatted = "";
if (hours > 0) {
formatted += hours + ":";
}
formatted += String(minutes).padStart(2, '0') + ":" + String(seconds).padStart(2, '0');
return formatted;
}

/**
* Parses a duration string (e.g., "H:MM:SS" or "MM:SS") into total seconds.
* @param {string} duration - The duration string.
* @returns {number} The total duration in seconds.
*/
function parseDurationToSeconds(duration) {
if (!duration) {
logWarn("parseDurationToSeconds: duration is undefined or null, returning 0.");
return 0;
}
const parts = duration.split(':').map(Number);
let seconds = 0;

if (parts.length === 3) { // H:M:S
seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
} else if (parts.length === 2) { // M:S
seconds = parts[0] * 60 + parts[1];
} else if (parts.length === 1) { // S (unlikely for YouTube but robust)
seconds = parts[0];
}
return seconds;
}

/**
* Formats a given number of seconds into "H:MM:SS" or "MM:SS" using moment.js.
* @param {number} seconds - The total seconds to format.
* @returns {string} The formatted time string.
*/
function iso8601Duration(seconds) {
if (isNaN(seconds) || seconds < 0) {
logWarn("iso8601Duration: Invalid seconds input, returning '00:00'.", seconds);
return "00:00";
}
const duration = moment.duration(seconds, "seconds");
let time = "";
if (duration.hours() > 0) {
time += String(duration.hours()) + ":";
}
time +=
String(duration.minutes()).padStart(2, "0") +
":" +
String(duration.seconds()).padStart(2, "0");
return time;
}

// Expose these utilities globally for other scripts
window.logDebug = logDebug;
window.logWarn = logWarn;
window.logError = logError;
window.formatDuration = formatDuration;
window.parseDurationToSeconds = parseDurationToSeconds;
window.iso8601Duration = iso8601Duration;