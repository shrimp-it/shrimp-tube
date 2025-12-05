/**
* main-app.js
*
* This script contains the core application logic, YouTube player initialization,
* URL parameter handling, YouTube API interactions, and modal control for
* search, chat, and player controls.
* It depends on global-utils.js for logging and moment.js for duration formatting.
* It provides global variables and functions consumed by playlist-manager.js.
*/

// Global access to utilities (from global-utils.js)
// logDebug, logWarn, logError, formatDuration, parseDurationToSeconds, iso8601Duration

// ######### set-up webapp #####
// ######## API ###############
// ##########################
// ### API functions for player controls
// ## playVideoAPI()
// ## pauseVideoAPI()
// ## seekForwardAPI(seconds)
// ## seekBackwardAPI(seconds)
// ## toggleCaptionsAPI()
// ## skipNextAPI()
// ## skipLastAPI()
// ## setCaptionLanguageAPI(languageCode)
// ## setAudioTrackAPI(trackId)
// ## setVideoQualityAPI(quality)
// ## savePlaylistProgress(videoId, position)
// ## getPlaylistProgress(videoId)
// ## removePlaylistProgress(videoId)
// ## loadPlaylistProgress()
// ## setActivePlaylistItemFromUrl(videoId, playlistPosition, position)
// ## setActivePlaylistItem(videoId, playlistPosition, position)
// ## updateActivePlaylistItem()
// #### Modify playVideo to update the URL:
// #### playVideo(videoId, index, startSeconds = 0)
// ## highlightActivePlaylistItem()
// ## clearHighlight()
// ## restoreActivePlaylistItem()
// ## saveActivePlaylistItem()
// ## savePlaylistToLocalStorage()
// #### playNextVideo()
// ## removeVideoFromPlaylist(videoId)
// ## renderPlaylist()
// ## recommendVideos(videoName, videoId) (Gemini API)
// ## resetPlaylistProgress()
// ## getYouTubePlaylistName(playlistId, apiKey)
// ## addVideosToPlaylist(videoIds)
// #### loadSettings() Function to load settings from local storage
// ##
// #################################

// ## Global variables - accessible via window object in other scripts if needed
window.player; // YouTube Player object
window.currentPlaylist = []; // Array of video IDs in the current playlist
window.currentPlaylistDetails = []; // Array of detailed video objects ({id, title, duration})
window.originalPlaylistDetails = []; // Backup of playlist details for filter reset
window.currentVideoIndex = -1; // Index of the currently playing video
window.initialLoadComplete = false; // Flag to track initial load completion
window.maxresults = 50; // Max items fetched from YouTube API per playlist page;
window.ytapiNextpagetokko = "false"; // Max items fetched from YouTube API per playlist page (controlled by new toggle)
window.updateTimeURL = 4000; // Time in ms to update current position in URL-param
window.timeUpdateInterval; // Interval ID for URL updates
window.playerReady = false; // Flag for YouTube player readiness

//####### Get URL parameters ##
window.urlParams = new URLSearchParams(window.location.search);

window.apiKey = window.urlParams.get("apiKey"); // YouTube API Key
window.initialPlaylistParam = window.urlParams.get("playlist");
window.chatUserName = window.urlParams.get("name") || "Anonym";
window.activeVidParam = window.urlParams.get("activeVid");
window.geminiApiKey = window.urlParams.get("keygemini") || localStorage.getItem(`${window.chatUserName}-keygemini`);

if (window.urlParams.get("keygemini")) {
window.geminiApiKey = window.urlParams.get("keygemini");
localStorage.setItem(`${window.chatUserName}-keygemini`, window.geminiApiKey);
logDebug("Gemini API key updated and stored in local storage.");
} else if (localStorage.getItem(`${window.chatUserName}-keygemini`)) {
window.geminiApiKey = localStorage.getItem(`${window.chatUserName}-keygemini`);
logDebug("Gemini API key retrieved from local storage.");
} else {
logWarn("No Gemini API key provided or found in local storage.");
}

//####### Modal elements (from index.html) ##
window.searchModal = document.getElementById("search-modal");
window.chatModal = document.getElementById("chat-modal");
window.searchBtn = document.getElementById("search-btn");
window.chatBtn = document.getElementById("chat-btn");
window.closeBtns = document.querySelectorAll(".close-btn"); // Close buttons for main modals
window.searchFrame = document.getElementById("search-frame");
window.chatFrame = document.getElementById("chat-frame");

// ## Modal state variables#
let searchModalInitialized = false;
let chatModalInitialized = false;

// ## Player Controls Modal elements#
window.playerControlsModal = document.getElementById("player-controls-modal");
window.playerControlsBtn = document.getElementById("player-controls-btn");
window.playerControlsFrame = document.getElementById("player-controls-frame");
let playerControlsModalInitialized = false;

// ## Playlist elements (from index.html) #
window.playlistElement = document.getElementById("playlist");
window.videoIdInput = document.getElementById("video-id-input");
window.addVideoBtn = document.getElementById("add-video-btn");

// New buttons are now handled by their direct IDs where possible or dynamically created in playlist-manager.js

window.toggleHeaderBtn = document.getElementById("toggle-header-btn");
window.toggleHeaderBtn.textContent = "navi_out"; // Initial text

window.togglePlaylistBtn = document.getElementById("toggle-playlist-btn");
window.togglePlaylistBtn.textContent = " 🎀"; // Initial text


// --- DOM Ready Logic for button groups and initial UI setup ---
document.addEventListener("DOMContentLoaded", () => {
const controlsDiv = document.querySelector(".controls");
if (!controlsDiv) {
logError("Controls div not found, cannot append button groups.");
return;
}

// Create button groups if not existing or get them
window.inputBtnGroup = controlsDiv.querySelector(".input-btn-group") || document.createElement("div");
window.inputBtnGroup.classList.add("input-btn-group");

window.subpageBtnGroup = controlsDiv.querySelector(".subpage-btn-group") || document.createElement("div");
window.subpageBtnGroup.classList.add("subpage-btn-group");

window.toggleBtnGroup = controlsDiv.querySelector(".toggle-btn-group") || document.createElement("div");
window.toggleBtnGroup.classList.add("toggle-btn-group");

window.fileactionBtnGroup = controlsDiv.querySelector(".fileaction-btn-group") || document.createElement("div");
window.fileactionBtnGroup.classList.add("fileaction-btn-group");

// Append buttons to their respective groups (only if not already there)
if (!window.inputBtnGroup.contains(window.addVideoBtn)) window.inputBtnGroup.appendChild(window.addVideoBtn);
if (!window.subpageBtnGroup.contains(window.searchBtn)) window.subpageBtnGroup.appendChild(window.searchBtn);
if (!window.subpageBtnGroup.contains(window.chatBtn)) window.subpageBtnGroup.appendChild(window.chatBtn);
if (!window.toggleBtnGroup.contains(window.toggleHeaderBtn)) window.toggleBtnGroup.appendChild(window.toggleHeaderBtn);
if (!window.toggleBtnGroup.contains(window.togglePlaylistBtn)) window.toggleBtnGroup.appendChild(window.togglePlaylistBtn);

// Snapshot buttons are now handled directly by the `onclick` in index.html
// and their custom functions below. No need to append dynamically here.

// Append button groups to the controls div (only if not already there)
if (!controlsDiv.contains(window.inputBtnGroup)) controlsDiv.appendChild(window.inputBtnGroup);
if (!controlsDiv.contains(window.subpageBtnGroup)) controlsDiv.appendChild(window.subpageBtnGroup);
if (!controlsDiv.contains(window.toggleBtnGroup)) controlsDiv.appendChild(window.toggleBtnGroup);
if (!controlsDiv.contains(window.fileactionBtnGroup)) controlsDiv.appendChild(window.fileactionBtnGroup);


// Task 2: Enhanced "Copy List IDs" Functionality
const copyidvidsBtn = document.getElementById("copyidvids_btn");
if (copyidvidsBtn) {
copyidvidsBtn.addEventListener("click", async (e) => {
e.stopImmediatePropagation();
e.preventDefault();

window.logDebug("copyidvids_btn clicked. Executing copy playlist function.");

try {
let playlistString;
const playlistElement = document.getElementById("playlist");
// selectionMode is a global variable from playlist-manager.js
const selectionMode = window.selectionMode;

if (selectionMode) {
// If selection mode is active, copy only selected video IDs
playlistString = Array.from(playlistElement.querySelectorAll("li"))
.filter((li) => li.classList.contains("selected"))
.map((li) => li.dataset.videoId)
.filter((videoId) => videoId)
.join(",");
logDebug("Copied selected video IDs:", playlistString);
} else {
// Otherwise, copy all videos in the current playlist
playlistString = window.currentPlaylist.join(",");
logDebug("Copied all video IDs:", playlistString);
}

await navigator.clipboard.writeText(playlistString);
alert("Playlist IDs copied to clipboard!"); // Notify the user
} catch (err) {
window.logError("Failed to copy playlist to clipboard: ", err);
alert("Failed to copy playlist to clipboard."); // Notify the user about the error
}

const columnOptions = copyidvidsBtn.closest('.column-options');
if (columnOptions) {
columnOptions.style.display = "none";
window.logDebug("Column options hidden after copy action.");
} else {
window.logWarn("Could not find parent .column-options for copyidvids_btn to hide.");
}
}, { capture: true });
window.logDebug("Event listener attached to #copyidvids_btn for copy functionality.");
}
window.logDebug("Button groups and elements appended/verified.");

// Task 7: Event listeners for Export/Import PL snapshot buttons
const exportPlSnapshotBtn = document.getElementById('export-pl-snapshot-btn');
if (exportPlSnapshotBtn) {
exportPlSnapshotBtn.addEventListener('click', window.exportPlaylistSnapshot);
logDebug("Event listener attached to #export-pl-snapshot-btn.");
}
const importPlSnapshotBtn = document.getElementById('import-pl-snapshot-btn');
if (importPlSnapshotBtn) {
importPlSnapshotBtn.addEventListener('click', window.importPlaylistSnapshot);
logDebug("Event listener attached to #import-pl-snapshot-btn.");
}


});

window.headerElement = document.getElementById("header");
window.playlistContainer = document.getElementById("playlist-container");

// Local Storage Keys (prefixed for user and playlist)
window.localStorageKey;
window.activePlaylistKey;
window.playlistProgressKey;
// NEW: Local Storage Key for Snapshot functionality
window.snapshotKey = 'user-shrimptube-snapshot';


document.addEventListener("DOMContentLoaded", () => {
if (window.initialPlaylistParam) {
window.localStorageKey = `${window.chatUserName}-mytubePlaylist_${window.initialPlaylistParam}`;
window.activePlaylistKey = `${window.chatUserName}-actu-pl_${window.initialPlaylistParam}`;
window.playlistProgressKey = `${window.chatUserName}-playlistProgress_${window.initialPlaylistParam}`;
logDebug(
"Using playlist parameter for local storage key:",
window.localStorageKey
);
} else {
window.localStorageKey = `${window.chatUserName}-mytubePlaylist_default`;
window.activePlaylistKey = `${window.chatUserName}-actu-pl_default`;
window.playlistProgressKey = `${window.chatUserName}-playlistProgress_default`;
logDebug("Using default local storage key:", window.localStorageKey);
}
});


// Toggle Header
if (window.toggleHeaderBtn && window.headerElement) {
window.toggleHeaderBtn.addEventListener("click", () => {
logDebug("Toggle Header button clicked.");
window.headerElement.classList.toggle("hidden");
window.toggleHeaderBtn.textContent = window.headerElement.classList.contains("hidden")
? "navi_on"
: "navi_out";
logDebug("Header visibility toggled. Button text updated.");
});
}


// Toggle Header MG (shrimp button)
const alphatubeBtn = document.querySelector(".alphatube-btn");
if (alphatubeBtn && window.headerElement) {
alphatubeBtn.addEventListener("click", () => {
logDebug("Toggle shrimp button alphatube-btn: toggle Header button clicked.");
window.headerElement.classList.toggle("hidden");
// No text change for alphatubeBtn, it's a static emoji
logDebug("Header visibility toggled ..");
});
}


// Toggle Playlist
if (window.togglePlaylistBtn && window.playlistContainer) {
window.togglePlaylistBtn.addEventListener("click", () => {
logDebug("Toggle Playlist button clicked.");
window.playlistContainer.classList.toggle("hidden");
window.togglePlaylistBtn.textContent = window.playlistContainer.classList.contains("hidden")
? "🎗"
: "🎀";
logDebug("Playlist visibility toggled. Button text updated.");
});
}

// REMOVED: Old 'saveTmpPlaylistBtn' and 'loadTmpPlaylistBtn' listeners as they are replaced by snapshot functions.
// Their HTML counterparts '_new' now call 'window.savePlaylistSnapshot()' and 'window.loadPlaylistSnapshot()'.


// NEW: Snapshot functionality (save/load-PL)
/**
* Saves the current playlist details, progress, and settings as a snapshot to local storage.
* Uses the key 'user-shrimptube-snapshot'.
*/
window.savePlaylistSnapshot = function() {
logDebug("Attempting to save playlist snapshot.");
try {
const playlistData = [...window.currentPlaylistDetails];
const playlistProgress = JSON.parse(localStorage.getItem(window.playlistProgressKey) || "{}");

// Collect current settings
const settings = {
ytapiNextpagetokko: window.ytapiNextpagetokko,
playlistMode: localStorage.getItem(`${window.chatUserName}-playlistMode`) || "auto-skip-down",
filterText: localStorage.getItem(`${window.chatUserName}-filterText`) || "",
sortValue: localStorage.getItem(`${window.chatUserName}-sortValue`) || "original",
captionLanguage: localStorage.getItem(`${window.chatUserName}-captionLanguage`) || "",
videoQuality: localStorage.getItem(`${window.chatUserName}-videoQuality`) || "",
activePlaylistItem: JSON.parse(localStorage.getItem(window.activePlaylistKey) || "null")
};

const snapshot = {
playlistDetails: playlistData,
playlistProgress: playlistProgress,
settings: settings,
timestamp: new Date().toISOString()
};

localStorage.setItem(window.snapshotKey, JSON.stringify(snapshot));
logDebug(`Playlist snapshot saved to local storage under '${window.snapshotKey}'.`);
alert("Current session snapshot saved successfully!");
} catch (error) {
logError("Error saving playlist snapshot:", error);
alert("Failed to save session snapshot.");
}
};

/**
* Loads a playlist snapshot from local storage, restoring playlist details, progress, and settings.
* Uses the key 'user-shrimptube-snapshot'.
*/
window.loadPlaylistSnapshot = async function() {
logDebug("Attempting to load playlist snapshot.");
try {
const storedSnapshot = localStorage.getItem(window.snapshotKey);
if (!storedSnapshot) {
logWarn(`No playlist snapshot found in local storage under '${window.snapshotKey}'.`);
alert("No saved snapshot found.");
return;
}

const snapshot = JSON.parse(storedSnapshot);
logDebug("Loaded snapshot data:", snapshot);

// 1. Restore playlist details
window.currentPlaylistDetails = snapshot.playlistDetails || [];
window.currentPlaylist = window.currentPlaylistDetails.map(video => video.id);
window.savePlaylistToLocalStorage(); // Persist the restored main playlist

// 2. Restore playlist progress
localStorage.setItem(window.playlistProgressKey, JSON.stringify(snapshot.playlistProgress || {}));
window.loadPlaylistProgress(); // Refresh internal progress state

// 3. Restore settings
if (snapshot.settings) {
window.ytapiNextpagetokko = snapshot.settings.ytapiNextpagetokko || "false";
localStorage.setItem(`${window.chatUserName}-playlistMode`, snapshot.settings.playlistMode || "auto-skip-down");
localStorage.setItem(`${window.chatUserName}-filterText`, snapshot.settings.filterText || "");
localStorage.setItem(`${window.chatUserName}-sortValue`, snapshot.settings.sortValue || "original");
localStorage.setItem(`${window.chatUserName}-captionLanguage`, snapshot.settings.captionLanguage || "");
localStorage.setItem(`${window.chatUserName}-videoQuality`, snapshot.settings.videoQuality || "");

// Restore active playlist item from snapshot, if available
if (snapshot.settings.activePlaylistItem) {
localStorage.setItem(window.activePlaylistKey, JSON.stringify(snapshot.settings.activePlaylistItem));
} else {
localStorage.removeItem(window.activePlaylistKey); // Clear if no active item in snapshot
}
}

// Re-render playlist and apply all settings
window.renderPlaylist();
window.loadSettings(); // This will apply filter/sort/playlist mode

// Update the toggle button for video limit display
const toggleVidLimitBtn = document.getElementById("toggle-vid-limit-btn");
if (toggleVidLimitBtn) {
toggleVidLimitBtn.textContent = (window.ytapiNextpagetokko === 'true') ? "all vids" : "50 vids";
}

// Attempt to play the active video from the snapshot
if (snapshot.settings && snapshot.settings.activePlaylistItem) {
const activeItem = snapshot.settings.activePlaylistItem;
const actualIndex = window.currentPlaylist.indexOf(activeItem.videoId);
if (actualIndex !== -1 && window.playerReady) {
window.playVideo(activeItem.videoId, actualIndex, activeItem.position);
logDebug("Restored and started playing active video from snapshot.");
} else if (actualIndex !== -1 && !window.playerReady) {
// If player not ready, ensure it will play when ready
const intervalId = setInterval(() => {
if (window.playerReady) {
clearInterval(intervalId);
window.playVideo(activeItem.videoId, actualIndex, activeItem.position);
logDebug("Restored and started playing active video from snapshot after player was ready.");
}
}, 500);
} else {
logWarn(`Video ID ${activeItem.videoId} from snapshot not found in restored playlist, cannot play.`);
if (window.currentPlaylist.length > 0 && window.playerReady) {
window.playVideo(window.currentPlaylist[0], 0); // Play first video as fallback
}
}
} else if (window.currentPlaylist.length > 0 && window.playerReady && (typeof window.player.getPlayerState !== 'function' || (window.player.getPlayerState() !== YT.PlayerState.PLAYING && window.player.getPlayerState() !== YT.PlayerState.PAUSED))) {
window.playVideo(window.currentPlaylist[0], 0); // Play first video if no active item in snapshot
}


alert("Session snapshot loaded successfully!");
} catch (error) {
logError("Error loading playlist snapshot:", error);
alert("Failed to load session snapshot. Check console for details.");
}
};


// Task 7: Export Playlist Snapshot to JSON file
window.exportPlaylistSnapshot = function() {
logDebug("Attempting to export playlist snapshot to file.");
try {
// Reuse the logic from savePlaylistSnapshot to gather the data
const playlistData = [...window.currentPlaylistDetails];
const playlistProgress = JSON.parse(localStorage.getItem(window.playlistProgressKey) || "{}");

const settings = {
ytapiNextpagetokko: window.ytapiNextpagetokko,
playlistMode: localStorage.getItem(`${window.chatUserName}-playlistMode`) || "auto-skip-down",
filterText: localStorage.getItem(`${window.chatUserName}-filterText`) || "",
sortValue: localStorage.getItem(`${window.chatUserName}-sortValue`) || "original",
captionLanguage: localStorage.getItem(`${window.chatUserName}-captionLanguage`) || "",
videoQuality: localStorage.getItem(`${window.chatUserName}-videoQuality`) || "",
activePlaylistItem: JSON.parse(localStorage.getItem(window.activePlaylistKey) || "null")
};

const snapshot = {
playlistDetails: playlistData,
playlistProgress: playlistProgress,
settings: settings,
timestamp: new Date().toISOString(),
// Add app version or other metadata if desired
};

const jsonString = JSON.stringify(snapshot, null, 2); // Pretty print JSON
const blob = new Blob([jsonString], { type: 'application/json' });

const a = document.createElement('a');
a.href = URL.createObjectURL(blob);

// Suggested name template: "${url para: name}-pl-snapshot.json"
const userName = window.chatUserName || "unknown";
a.download = `${userName}-pl-snapshot.json`;

document.body.appendChild(a); // Append to body to make it clickable
a.click(); // Trigger the download
document.body.removeChild(a); // Clean up
URL.revokeObjectURL(a.href); // Revoke the object URL

logDebug(`Playlist snapshot exported as '${a.download}'.`);
alert("Session snapshot exported successfully!");
} catch (error) {
logError("Error exporting playlist snapshot:", error);
alert("Failed to export session snapshot.");
}
};

// Task 7: Import Playlist Snapshot from JSON file
window.importPlaylistSnapshot = function() {
logDebug("Attempting to import playlist snapshot from file.");
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'application/json'; // Accept JSON files

fileInput.addEventListener('change', (event) => {
const file = event.target.files[0];
if (!file) {
logDebug("No file selected for import.");
return;
}

const reader = new FileReader();
reader.onload = async (e) => {
try {
const jsonContent = e.target.result;
const snapshot = JSON.parse(jsonContent);

if (!snapshot || !snapshot.playlistDetails || !snapshot.playlistProgress || !snapshot.settings) {
throw new Error("Invalid snapshot file format. Missing core data.");
}

logDebug("Importing snapshot data:", snapshot);

// 1. Restore playlist details
window.currentPlaylistDetails = snapshot.playlistDetails;
window.currentPlaylist = window.currentPlaylistDetails.map(video => video.id);
window.savePlaylistToLocalStorage();

// 2. Restore playlist progress
localStorage.setItem(window.playlistProgressKey, JSON.stringify(snapshot.playlistProgress));
window.loadPlaylistProgress();

// 3. Restore settings
window.ytapiNextpagetokko = snapshot.settings.ytapiNextpagetokko || "false";
localStorage.setItem(`${window.chatUserName}-playlistMode`, snapshot.settings.playlistMode);
localStorage.setItem(`${window.chatUserName}-filterText`, snapshot.settings.filterText || "");
localStorage.setItem(`${window.chatUserName}-sortValue`, snapshot.settings.sortValue);
localStorage.setItem(`${window.chatUserName}-captionLanguage`, snapshot.settings.captionLanguage || "");
localStorage.setItem(`${window.chatUserName}-videoQuality`, snapshot.settings.videoQuality || "");

if (snapshot.settings.activePlaylistItem) {
localStorage.setItem(window.activePlaylistKey, JSON.stringify(snapshot.settings.activePlaylistItem));
} else {
localStorage.removeItem(window.activePlaylistKey);
}

// Re-render playlist and apply all settings
window.renderPlaylist();
window.loadSettings();

// Attempt to play the active video from the snapshot
if (snapshot.settings && snapshot.settings.activePlaylistItem) {
const activeItem = snapshot.settings.activePlaylistItem;
const actualIndex = window.currentPlaylist.indexOf(activeItem.videoId);
if (actualIndex !== -1 && window.playerReady) {
window.playVideo(activeItem.videoId, actualIndex, activeItem.position);
logDebug("Restored and started playing active video from imported snapshot.");
} else if (actualIndex !== -1 && !window.playerReady) {
const intervalId = setInterval(() => {
if (window.playerReady) {
clearInterval(intervalId);
window.playVideo(activeItem.videoId, actualIndex, activeItem.position);
logDebug("Restored and started playing active video from imported snapshot after player was ready.");
}
}, 500);
} else {
logWarn(`Video ID ${activeItem.videoId} from imported snapshot not found in restored playlist, cannot play.`);
if (window.currentPlaylist.length > 0 && window.playerReady) {
window.playVideo(window.currentPlaylist[0], 0);
}
}
} else if (window.currentPlaylist.length > 0 && window.playerReady && (typeof window.player.getPlayerState !== 'function' || (window.player.getPlayerState() !== YT.PlayerState.PLAYING && window.player.getPlayerState() !== YT.PlayerState.PAUSED))) {
window.playVideo(window.currentPlaylist[0], 0);
}

alert("Session snapshot imported successfully!");

} catch (error) {
logError("Error importing snapshot file:", error);
alert(`Failed to import session snapshot: ${error.message}. Check console for details.`);
}
};
reader.readAsText(file); // Read the file as text
});

fileInput.click(); // Programmatically click the file input to open dialog
};


// ## Initialize the YouTube player
function onYouTubeIframeAPIReady() {
logDebug("YouTube Iframe API is ready. Initializing player.");
window.player = new YT.Player("player", {
height: "100%",
width: "100%",
playerVars: {
playsinline: 1
},
events: {
onReady: window.onPlayerReady, // Call global onPlayerReady from playlist-manager.js
onStateChange: window.onPlayerStateChange // Call global onPlayerStateChange from playlist-manager.js
}
});
logDebug("YouTube player object created.");
}


// ### Communication with iframes (Search, Chat)
window.addEventListener("message", async (event) => {
if (event.data.type === "add-to-playlist") {
await window.addVideosToPlaylist([event.data.videoId]); // Use global addVideosToPlaylist
logDebug("Received 'add-to-playlist' message from iframe:", event.data.videoId);
} else if (event.data.type === "get-playlist") {
if (window.chatFrame && window.chatFrame.contentWindow) {
window.chatFrame.contentWindow.postMessage(
{ type: "playlist-for-chat", playlist: window.currentPlaylist.join(",") },
"*"
);
logDebug("Received 'get-playlist' message, sent current playlist to chat iframe.");
}
} else if (event.data.type === "set-playlist") {
const newPlaylistIds = event.data.playlist.split(",").filter((id) => id);
window.currentPlaylist = [];
window.currentPlaylistDetails = [];
await window.addVideosToPlaylist(newPlaylistIds); // Use global addVideosToPlaylist
if (window.currentPlaylist.length > 0 && window.playerReady) {
window.playVideo(window.currentPlaylist[0], 0); // Use global playVideo
}
logDebug("Received 'set-playlist' message, updated playlist from iframe.");
} else if (event.data.type === "add-from-chat") {
const extractedIds = event.data.ids;
await window.addVideosToPlaylist(extractedIds); // Use global addVideosToPlaylist
logDebug("Received 'add-from-chat' message, added videos from chat iframe.");
}
});


// --- Modal functionality for search/chat/player-controls (standard modals) ---
if (window.searchBtn) {
window.searchBtn.onclick = () => {
if (!searchModalInitialized) {
window.searchFrame.src = `yt-query-clips.html?apiKey=${window.apiKey}&name=${window.chatUserName}&ytquery=dokumentation`;
searchModalInitialized = true;
}
if (window.searchModal) window.searchModal.style.display = "block";
logDebug("Search modal opened.");
};
}


if (window.playerControlsBtn) {
window.playerControlsBtn.onclick = () => {
if (!playerControlsModalInitialized) {
// The src for player-controls-frame is already set in index.html
// window.playerControlsFrame.src = `player-controls.html`;
playerControlsModalInitialized = true;
}
if (window.playerControlsModal) window.playerControlsModal.style.display = "block";
logDebug("Player Controls modal opened.");
};
}


if (window.chatBtn) {
window.chatBtn.onclick = () => {
if (!chatModalInitialized) {
window.chatFrame.src = `shrimp-webrtc-chat.html?imessage=Ping&room=RoomMRDURSTintG001&pass=jhfjHlsFF2230x&name=${window.chatUserName}`;
chatModalInitialized = true;
}
if (window.chatModal) window.chatModal.style.display = "block";
logDebug("Chat modal opened.");
};
}

// Generic close buttons for the standard modals (.modal class)
if (window.closeBtns) {
window.closeBtns.forEach((btn) => {
btn.onclick = (event) => {
event.preventDefault();
const modal = event.target.closest(".modal");
if (modal) {
modal.style.display = "none";
logDebug(`${modal.id} closed by close button.`);
}
};
});
}


// Close standard modals when clicking outside
window.addEventListener('click', (event) => {
if (window.searchModal && event.target === window.searchModal) {
window.searchModal.style.display = "none";
logDebug("Search modal closed by outside click.");
}
if (window.chatModal && event.target === window.chatModal) {
window.chatModal.style.display = "none";
logDebug("Chat modal closed by outside click.");
}
if (window.playerControlsModal && event.target === window.playerControlsModal) {
window.playerControlsModal.style.display = "none";
logDebug("Player Controls modal closed by outside click.");
}
});

// --- Player API functions (exposed globally for player-controls.html iframe communication) ---

/**
* Sets the YouTube player's volume.
* @param {number} volume - The volume level (0-100).
*/
window.setPlayerVolume = function(volume) {
if (window.player) {
window.player.setVolume(volume);
logDebug(`Player volume set to: ${volume}`);
} else {
logWarn("setPlayerVolume: Player not ready.");
}
};

/** Stops the currently playing video. */
window.stopVideoAPI = function() {
if (window.player) {
window.player.stopVideo();
logDebug("Video stopped via API.");
} else {
logWarn("stopVideoAPI: Player not ready.");
}
};

/** Toggles fullscreen mode for the player iframe. */
window.togglePictureInPictureAPI = function() {
if (document.fullscreenElement) {
document.exitFullscreen();
logDebug("Exited fullscreen.");
} else if (window.player && typeof window.player.getIframe === 'function') {
const iframe = window.player.getIframe();
if (iframe && iframe.requestFullscreen) {
iframe.requestFullscreen();
logDebug("Entered fullscreen for player.");
} else {
logWarn("Fullscreen API not available or player iframe not found.");
}
} else {
logWarn("togglePictureInPictureAPI: Player or getIframe not ready.");
}
};

/** Starts video playback. */
window.playVideoAPI = function() {
if (window.player && typeof window.player.playVideo === 'function') {
window.player.playVideo();
logDebug("Video playback started via API.");
} else {
logWarn("playVideoAPI: Player or playVideo function not ready.");
}
};

/** Pauses video playback. */
window.pauseVideoAPI = function() {
if (window.player && typeof window.player.pauseVideo === 'function') {
window.player.pauseVideo();
logDebug("Video paused via API.");
} else {
logWarn("pauseVideoAPI: Player or pauseVideo function not ready.");
}
};

/** Mutes the player. */
window.muteVideoAPI = function() {
if (window.player) {
window.player.mute();
logDebug("Player muted via API.");
} else {
logWarn("muteVideoAPI: Player not ready.");
}
};

/** Unmutes the player based on a 'textstr' condition (e.g., button text). */
window.unMuteVideoAPI = function(textstr) { // textstr seems to be for visual feedback on button, not actual mute/unmute
if (window.player) {
if (textstr === '🔈') { // Assuming '🔈' means unmuted state, so unmute if that's the desired outcome
window.player.unMute();
logDebug("Player unmuted via API.");
} else { // If not '🔈', assume it should be muted
window.player.mute();
logDebug("Player muted via API based on textstr.");
}
} else {
logWarn("unMuteVideoAPI: Player not ready.");
}
};


/**
* Schedules a video stop after a specified delay.
* @param {number} [milsec=6000] - The delay in milliseconds before stopping.
*/
window.stopVideoInAPI = function(milsec) {
milsec = milsec || 6000;
setTimeout(window.stopVideoAPI, milsec);
logDebug(`Scheduled video stop in ${milsec}ms.`);
};

/**
* Seeks the video forward by a specified number of seconds.
* @param {number} seconds - The number of seconds to seek forward.
*/
window.seekForwardAPI = function(seconds) {
if (window.player && typeof window.player.getCurrentTime === 'function') {
const currentTime = window.player.getCurrentTime();
window.player.seekTo(currentTime + seconds, true);
logDebug(`Seeked forward by ${seconds} seconds.`);
} else {
logWarn("seekForwardAPI: Player or getCurrentTime function not ready.");
}
};

/**
* Seeks the video backward by a specified number of seconds.
* @param {number} seconds - The number of seconds to seek backward.
*/
window.seekBackwardAPI = function(seconds) {
if (window.player && typeof window.player.getCurrentTime === 'function') {
const currentTime = window.player.getCurrentTime();
window.player.seekTo(currentTime - seconds, true);
logDebug(`Seeked backward by ${seconds} seconds.`);
} else {
logWarn("seekBackwardAPI: Player or getCurrentTime function not ready.");
}
};

/** Toggles captions (placeholder - full implementation needs more YouTube API features). */
window.toggleCaptionsAPI = function() {
logWarn("Toggle Captions functionality not yet fully implemented. Requires player.setOption('captions', 'track', {languageCode: 'en'}) or similar.");
alert("Toggle Captions functionality not yet implemented.");
};

/** Skips to the next video in the playlist. */
window.skipNextAPI = function() {
if (typeof window.playNextVideo === 'function') { // Global from playlist-manager.js
window.playNextVideo();
logDebug("Skipped to next video via API.");
} else {
logWarn("skipNextAPI: playNextVideo function not available globally.");
}
};

/** Skips to the previous video in the playlist. */
window.skipLastAPI = function() {
if (typeof window.playPreviousVideo === 'function') { // Global from playlist-manager.js
window.playPreviousVideo();
logDebug("Skipped to previous video via API.");
} else {
logWarn("skipLastAPI: playPreviousVideo function not available globally.");
}
};

/**
* Sets the caption language for the player.
* @param {string} languageCode - The language code (e.g., 'en', 'de').
*/
window.setCaptionLanguageAPI = function(languageCode) {
if (window.player && typeof window.player.setOption === 'function') {
window.player.setOption('captions', 'track', { 'languageCode': languageCode });
localStorage.setItem(`${window.chatUserName}-captionLanguage`, languageCode);
logDebug(`Saved caption language to local storage: ${languageCode}`);
} else {
logWarn("setCaptionLanguageAPI: player.setOption('captions', 'track', ...) is not available or not a function.");
}
};

/** Sets the audio track (placeholder - YouTube API has limited support). */
window.setAudioTrackAPI = function(trackId) {
logWarn("Setting audio track is not yet implemented. YouTube Iframe API limitations apply.");
alert("Setting audio track is not yet implemented.");
};

/**
* Sets the video playback quality.
* @param {string} quality - The desired quality (e.g., 'highres', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny', 'auto').
*/
window.setVideoQualityAPI = function(quality) {
if (window.player && typeof window.player.setPlaybackQuality === 'function') {
window.player.setPlaybackQuality(quality);
localStorage.setItem(`${window.chatUserName}-videoQuality`, quality);
logDebug(`Saved video quality to local storage: ${quality}`);
} else {
logWarn("setVideoQualityAPI: player.setPlaybackQuality is not available or not a function.");
}
};

// Global helper for playlist width (exposed from original script)
window.testPlWidth = function() {
const playlistItems = document.querySelectorAll("#playlist li");
if (playlistItems.length > 0) {
playlistItems.forEach((listele) => {
const span = listele.querySelector("span");
if (span) {
span.style.width = "78%";
// logDebug("Adjusting playlist item width."); // Remove for less logs
}
});
} else {
logDebug("testPlWidth: No playlist items found to adjust width.");
}
};