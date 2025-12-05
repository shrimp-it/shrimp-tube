/**
* playlist-manager.js
*
* Manages the application's YouTube playlist: adding, removing, rendering,
* saving/loading progress, filtering/sorting, sleep timer, and AI recommendations.
* Depends on main-app.js for global variables (window.player, window.currentPlaylist, etc.)
* and global-utils.js for logging and formatting.
*/

// Access to global variables and utilities from main-app.js and global-utils.js
// window.player, window.currentPlaylist, window.currentPlaylistDetails, window.originalPlaylistDetails,
// window.currentVideoIndex, window.initialLoadComplete, window.maxresults, window.updateTimeURL, window.timeUpdateInterval,
// window.urlParams, window.apiKey, window.chatUserName, window.activeVidParam, window.geminiApiKey,
// window.localStorageKey, window.activePlaylistKey, window.playlistProgressKey, window.snapshotKey
// window.playlistElement, window.videoIdInput, window.addVideoBtn,
// window.saveTmpPlaylistBtn, window.loadTmpPlaylistBtn, window.copyPlaylistToClipboardBtn,
// window.toggleHeaderBtn, window.togglePlaylistBtn, window.inputBtnGroup, window.subpageBtnGroup,
// window.toggleBtnGroup, window.fileactionBtnGroup, window.headerElement, window.playlistContainer,
// logDebug, logWarn, logError, formatDuration, parseDurationToSeconds, iso8601Duration.

// Ensure that these variables are actually initialized in main-app.js before use here.
// For dynamic elements like filterInput, sortSelect, playlistModeSelect, and selectToggleBtn,
// we'll fetch them from the DOM once DOMContentLoaded has fired.

let filterInput, sortSelect, playlistModeSelect, selectToggleBtn, sleepTimerInput, startTimerBtn;
let selectionMode = false; // Flag for playlist selection mode
let toggleVidLimitBtn; // Element for "All Vids" / "50 Vids" toggle

// Helper function to create/get filter/sort elements
// This needs to be called after the filter container is ensured in the DOM
function getOrCreateFilterElements() {
let filterContainer = document.getElementById("filter-container");
if (!filterContainer) {
logError("getOrCreateFilterElements: Filter container not found in DOM.");
return { filterContainer: null, filterInput: null, sortSelect: null };
}

let currentFilterInput = filterContainer.querySelector("input[type='text']");
let currentSortSelect = filterContainer.querySelector("select");

if (!currentFilterInput) {
currentFilterInput = document.createElement("input");
currentFilterInput.type = "text";
currentFilterInput.placeholder = "Filter playlist...";
filterContainer.appendChild(currentFilterInput);
logDebug("Dynamically created filter input.");
}
if (!currentSortSelect) {
currentSortSelect = document.createElement("select");

// NEW: Add 'Original' sorting option
const sortByOriginalOption = document.createElement("option");
sortByOriginalOption.value = "original";
sortByOriginalOption.textContent = "Original";
currentSortSelect.appendChild(sortByOriginalOption);

const sortByTitleOption = document.createElement("option");
sortByTitleOption.value = "title";
sortByTitleOption.textContent = "Sort by title";
currentSortSelect.appendChild(sortByTitleOption);

const sortByDurationOption = document.createElement("option");
sortByDurationOption.value = "duration";
sortByDurationOption.textContent = "Sort by duration";
currentSortSelect.appendChild(sortByDurationOption);

// Task 6: Add "Reverse Playlist" sorting option
const sortByReverseOption = document.createElement("option");
sortByReverseOption.value = "reverse";
sortByReverseOption.textContent = "Reverse Playlist";
currentSortSelect.appendChild(sortByReverseOption);

filterContainer.appendChild(currentSortSelect);
logDebug("Dynamically created sort select.");
}
return { filterContainer, filterInput: currentFilterInput, sortSelect: currentSortSelect };
}

/**
* Fetches video IDs from a YouTube playlist.
* @param {string} playlistId - The ID of the YouTube playlist.
* @param {string} apiKey - Your YouTube Data API key.
* @returns {Promise<string[]>} A promise that resolves to an array of video IDs.
*/
window.getInitialVideoIdsPromise = function(playlistId, apiKey) {
return new Promise(async (resolve, reject) => {
logDebug("Attempting to fetch initial video IDs from YouTube API for playlist:", playlistId);
let videoIds = [];
let nextPageToken = null;

// Use window.maxresults which is controlled by window.ytapiNextpagetokko
// YouTube API maxResults is 50, so use that as the upper bound for single requests.
let maxResultsPerRequest = 50;
logDebug(`Fetching with maxResultsPerRequest: ${maxResultsPerRequest}`);

try {
do {
let url = `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&part=snippet&playlistId=${playlistId}&maxResults=${maxResultsPerRequest}`;
if (nextPageToken) {
url += `&pageToken=${nextPageToken}`;
}

const response = await fetch(url);
if (!response.ok) {
throw new Error(`HTTP error! status: ${response.status}`);
}
const data = await response.json();

if (data.error) {
logError("YouTube API error fetching playlist items:", data.error);
reject(data.error.message);
return;
}

const fetchedIds = data.items.map(item => item.snippet.resourceId.videoId);
videoIds.push(...fetchedIds);

// Only fetch next pages if ytapiNextpagetokko is "true" (i.e., "all vids" mode)
if(window.ytapiNextpagetokko === "true"){
nextPageToken = data.nextPageToken;
} else {
nextPageToken = null; // Stop after first page if not "all vids"
}
logDebug(`Fetched ${fetchedIds.length} video IDs for playlist ${playlistId}, next page token: ${nextPageToken ? 'yes' : 'no'}. Current total: ${videoIds.length}`);

} while (nextPageToken);

logDebug(`Successfully fetched total ${videoIds.length} video IDs for playlist ${playlistId}.`);
resolve(videoIds);

} catch (error) {
logError("Error fetching video IDs for playlist:", playlistId, error);
reject(error);
}
});
};


/**
* Updates the browser's URL with the currently active video's ID, playlist position, and playback time.
*/
window.updateUrlWithActiveVid = function() {
if (window.player && typeof window.player.getVideoData === 'function' && window.player.getVideoData()) {
const videoId = window.player.getVideoData().video_id;
const position = Math.round(window.player.getCurrentTime());
const playlistPos = window.currentVideoIndex;

if (videoId !== undefined && playlistPos !== -1 && position !== undefined) {
const newActiveVid = `${videoId},${playlistPos},${position}`;
const url = new URL(window.location.href);
url.searchParams.set("activeVid", newActiveVid);
window.history.replaceState({}, "", url.toString());
logDebug("Updated URL with activeVid:", newActiveVid);
}
}
};


/**
* Callback function for when the YouTube player state changes.
* Handles playlist mode logic (auto-skip, play-clip).
* @param {object} event - The player state change event.
*/
window.onPlayerStateChange = function(event) {
logDebug("Player state changed:", event.data);
// Task 3: Playlist mode select is now static, so ensure it's fetched correctly.
playlistModeSelect = document.getElementById("playlist-mode-select");
const playlistMode = playlistModeSelect?.value || "auto-skip-down";

if (event.data === YT.PlayerState.ENDED) {
if (playlistMode === "play-clip") {
window.player.stopVideo();
logDebug("Playlist mode 'play-clip': Video stopped.");
} else if (playlistMode === "auto-skip-up") {
window.playPreviousVideo();
logDebug("Playlist mode 'auto-skip-up': Playing previous video.");
} else if (playlistMode === "auto-skip-down") {
window.playNextVideo();
logDebug("Playlist mode 'auto-skip-down': Playing next video.");
} else {
window.playNextVideo(); // Default
logDebug("Playlist mode default: Playing next video.");
}
} else if (event.data === YT.PlayerState.PLAYING) {
window.updateActivePlaylistItem();
// Ensure the interval is started only once when playing
if (!window.timeUpdateInterval) {
window.timeUpdateInterval = setInterval(() => {
window.updateActivePlaylistItem();
window.updateUrlWithActiveVid();
}, window.updateTimeURL);
logDebug(`Time update interval started (${window.updateTimeURL}ms).`);
}
} else {
// If player is paused, stopped, or buffered, clear the interval
if (window.timeUpdateInterval) {
clearInterval(window.timeUpdateInterval);
window.timeUpdateInterval = null;
logDebug("Time update interval cleared (player not playing).");
}
}
};


/**
* Plays the previous video in the playlist. Loops to the end if at the beginning.
* Feature 2: Resume Playback from Stored Duration
*/
window.playPreviousVideo = function() {
logDebug("Playing previous video.");
if (!window.player || typeof window.player.getVideoData !== 'function' || window.currentPlaylist.length === 0) return;

const currentPlayingVideoId = window.player.getVideoData()?.video_id;
const currentVideoIndexInPlaylist = window.currentPlaylist.indexOf(currentPlayingVideoId);

if (currentVideoIndexInPlaylist === -1) {
logWarn("playPreviousVideo: Currently playing video not found in currentPlaylist, falling back to last known index.");
window.currentVideoIndex = (window.currentVideoIndex - 1 + window.currentPlaylist.length) % window.currentPlaylist.length;
} else {
window.currentVideoIndex = (currentVideoIndexInPlaylist - 1 + window.currentPlaylist.length) % window.currentPlaylist.length;
}

const prevVideoId = window.currentPlaylist[window.currentVideoIndex];
// Feature 2: Resume from stored duration
const startSeconds = window.getPlaylistProgress(prevVideoId);
window.playVideo(prevVideoId, window.currentVideoIndex, startSeconds);
};

// --- Filter/Sort/Reorder functionality ---
document.addEventListener("DOMContentLoaded", () => {
// Ensure filter container is present in the DOM before trying to add elements
let filterContainer = document.getElementById("filter-container");
if (!filterContainer && window.playlistContainer) {
filterContainer = document.createElement("div");
filterContainer.id = "filter-container";
filterContainer.style.display = "none"; // Initially hidden
window.playlistContainer.appendChild(filterContainer);
logDebug("Dynamically created filter-container on DOMContentLoaded.");
}

({ filterInput, sortSelect } = getOrCreateFilterElements());

// Create "Filter" button
const filterToggleBtn = document.createElement("button");
filterToggleBtn.textContent = "Filter";
filterToggleBtn.id = "filter-toggle-btn";

if (window.toggleBtnGroup) { // toggleBtnGroup is exposed globally from main-app.js
window.toggleBtnGroup.appendChild(filterToggleBtn);
logDebug("Filter toggle button appended.");
} else {
logError("toggleBtnGroup not found to append filterToggleBtn.");
}

// Add event listener to toggle visibility of filter container
if (filterToggleBtn && filterContainer) {
filterToggleBtn.addEventListener("click", () => {
if (filterContainer.style.display === "none") {
filterContainer.style.display = "block";
filterToggleBtn.textContent = "Hide Filter";
logDebug("Filter container shown.");

// Add/ensure Reset button
let resetFilterBtn = filterContainer.querySelector("#reset-filter-btn");
if (!resetFilterBtn) {
resetFilterBtn = document.createElement("button");
resetFilterBtn.textContent = "Reset";
resetFilterBtn.id = "reset-filter-btn";
filterContainer.appendChild(resetFilterBtn);
resetFilterBtn.addEventListener("click", () => {
logDebug("Reset filter button clicked.");

// 1. Restore playlist details to original state
window.currentPlaylistDetails = [...window.originalPlaylistDetails];
window.currentPlaylist = window.currentPlaylistDetails.map(video => video.id); // Also update simple ID list

// 2. Clear UI filter/sort inputs
if (filterInput) filterInput.value = "";
if (sortSelect) sortSelect.value = "original"; // Set sort to default

// 3. Explicitly remove filter/sort settings from local storage
localStorage.removeItem(`${window.chatUserName}-filterText`);
localStorage.removeItem(`${window.chatUserName}-sortValue`);
logDebug("Filter/sort settings explicitly removed from local storage.");

// 4. Save the now-cleared settings persistently (this will ensure localStorage reflects the reset)
window.saveSettings(); // This call will now remove them if they are default

// 5. Re-render the playlist with the original/default settings
window.applyFiltersAndSorting(); // This will trigger renderPlaylist

// 6. Reset individual video progress (original functionality)
window.resetPlaylistProgress();
});

logDebug("Reset filter button created.");
}

// Add/ensure Apply button
let applyFilterBtn = filterContainer.querySelector("#apply-filter-btn");
if (!applyFilterBtn) {
applyFilterBtn = document.createElement("button");
applyFilterBtn.textContent = "Apply";
applyFilterBtn.id = "apply-filter-btn";
filterContainer.appendChild(applyFilterBtn);
applyFilterBtn.addEventListener("click", () => {
logDebug("Apply filter button clicked.");
window.currentPlaylist = Array.from(window.playlistElement.querySelectorAll("li"))
.map(li => li.dataset.videoId)
.filter(videoId => videoId);

window.currentPlaylistDetails = window.currentPlaylist.map(videoId => {
return window.originalPlaylistDetails.find(video => video.id === videoId);
}).filter(Boolean); // Remove any undefined entries if video not found

// window.updatePlaylistUrl(); // This function is not defined globally, removing call.
filterContainer.style.display = "none"; // Hide the filter container
filterToggleBtn.textContent = "Filter";
window.saveSettings(); // Save settings after applying filter
logDebug("Filter applied, playlist updated and saved.");
});
logDebug("Apply filter button created.");
}

// Add/ensure Delete button
let deleteFilterBtn = filterContainer.querySelector("#delete-filter-btn");
if (!deleteFilterBtn) {
deleteFilterBtn = document.createElement("button");
deleteFilterBtn.textContent = "Delete";
deleteFilterBtn.id = "delete-filter-btn";
filterContainer.appendChild(deleteFilterBtn);
deleteFilterBtn.addEventListener("click", () => {
logDebug("Delete filtered videos button clicked.");
const videosToDelete = Array.from(window.playlistElement.querySelectorAll("li"))
.map(li => li.dataset.videoId)
.filter(videoId => videoId);

videosToDelete.forEach(videoId => {
const indexToRemove = window.currentPlaylist.indexOf(videoId);
if (indexToRemove > -1) {
window.currentPlaylist.splice(indexToRemove, 1);
window.currentPlaylistDetails.splice(indexToRemove, 1);
window.removePlaylistProgress(videoId);
}
});
window.renderPlaylist();
window.savePlaylistToLocalStorage();
logDebug("Filtered videos deleted from playlist.");
});
logDebug("Delete filter button created.");
}

} else {
filterContainer.style.display = "none";
filterToggleBtn.textContent = "Filter";
logDebug("Filter container hidden.");
}
});
} else {
logWarn("Filter toggle button or filter container not found after DOMContentLoaded.");
}
});


/**
* Applies current filters and sorting to the playlist and re-renders it.
* Task 6: Extends sorting options to include "Reverse Playlist".
*/
window.applyFiltersAndSorting = function() {
// Ensure filterInput and sortSelect are defined
if (!filterInput || !sortSelect) {
({ filterInput, sortSelect } = getOrCreateFilterElements());
if (!filterInput || !sortSelect) {
logError("Filter/sort elements still not found. Cannot apply filters.");
return;
}
}

const filterText = filterInput.value.toLowerCase();
const sortValue = sortSelect.value;

// Use a copy of originalPlaylistDetails for filtering/sorting to maintain original order reference
// This is crucial for 'original' and 'reverse' to work correctly in conjunction with other sorts.
let workingPlaylist = [...window.originalPlaylistDetails];

// Apply filter
if (filterText) {
workingPlaylist = workingPlaylist.filter(video => video.title.toLowerCase().includes(filterText) );
logDebug(`Applied filter "${filterText}".`);
}

// Apply sorting
if (sortValue === "title") {
workingPlaylist.sort((a, b) => a.title.localeCompare(b.title));
logDebug("Applied sorting by title.");
} else if (sortValue === "duration") {
workingPlaylist.sort((a, b) => {
const durationA = window.parseDurationToSeconds(a.duration);
const durationB = window.parseDurationToSeconds(b.duration);
return durationA - durationB;
});
logDebug("Applied sorting by duration.");
} else if (sortValue === "reverse") {
// Task 6: Reverse the current order of the playlist (after other filters/sorts)
workingPlaylist.reverse();
logDebug("Applied sorting by reverse order.");
} else if (sortValue === "original") {
// If "original" is selected, the `workingPlaylist` should already be based on `originalPlaylistDetails`,
// which effectively restores the order prior to any interactive sorting/filtering.
// No explicit sorting operation is needed here, as `workingPlaylist` is already a copy of the base.
logDebug("Applied sorting by original order.");
}

// Update window.currentPlaylistDetails to reflect the filtered/sorted view
window.currentPlaylistDetails = workingPlaylist;
window.currentPlaylist = window.currentPlaylistDetails.map(video => video.id);


// Clear the existing playlist
if (window.playlistElement) window.playlistElement.innerHTML = "";

// Re-render the filtered and sorted playlist
window.currentPlaylistDetails.forEach((video, index) => { // Use updated window.currentPlaylistDetails for rendering
const videoId = video.id;
const lastPos = window.getPlaylistProgress(videoId);
const lastPosFormatted = lastPos > 0 ? window.iso8601Duration(lastPos) + " / " : "";

const li = document.createElement("li");

const checkbox = createPlaylistItemCheckbox(videoId);
li.appendChild(checkbox);

const videoInfoSpan = document.createElement("span");
videoInfoSpan.innerHTML = `${index + 1}. ${video.title} <span class="current-time">${lastPosFormatted}${video.duration}</span>`;
li.appendChild(videoInfoSpan);

const buttons = createPlaylistItemButtons(videoId, video.title);
li.appendChild(buttons);

li.dataset.videoId = videoId;
li.dataset.playlistPosition = index;

if (selectionMode) {
addPlaylistItemSelectionListener(li);
} else {
addPlaylistItemPlayListener(li, videoId, index);
}
if (window.playlistElement) window.playlistElement.appendChild(li);
});
logDebug("applyFiltersAndSorting done, playlist re-rendered.");
};

// Add event listeners to filter input and sort select
document.addEventListener("DOMContentLoaded", () => {
({ filterInput, sortSelect } = getOrCreateFilterElements()); // Ensure elements are ready

if (filterInput) {
filterInput.addEventListener('input', () => {
window.applyFiltersAndSorting();
window.saveSettings();
});
logDebug("Filter input event listener attached.");
}
if (sortSelect) {
sortSelect.addEventListener('change', () => {
window.applyFiltersAndSorting();
window.saveSettings();
});
logDebug("Sort select event listener attached.");
}
});

/**
* Loads application settings (playlist mode, filter, sort, video limit) from local storage.
*/
window.loadSettings = function() {
// IMPORTANT: Make a fresh copy of currentPlaylistDetails to originalPlaylistDetails
// before applying any loaded filters/sorts, to ensure a true reset point.
window.originalPlaylistDetails = [...window.currentPlaylistDetails];

// Task 3: playlistModeSelect is now static. Get it.
playlistModeSelect = document.getElementById("playlist-mode-select");
const storedPlaylistMode = localStorage.getItem(`${window.chatUserName}-playlistMode`);
if (storedPlaylistMode && playlistModeSelect) {
playlistModeSelect.value = storedPlaylistMode;
logDebug(`Loaded playlist mode: ${storedPlaylistMode}`);
}

// Ensure filterInput and sortSelect are initialized
if (!filterInput || !sortSelect) {
({ filterInput, sortSelect } = getOrCreateFilterElements());
}

const storedFilterText = localStorage.getItem(`${window.chatUserName}-filterText`);
if (storedFilterText && filterInput) {
filterInput.value = storedFilterText;
logDebug(`Loaded filter text: ${storedFilterText}`);
} else if (filterInput) { // If no stored text, ensure UI is clear
filterInput.value = "";
}

const storedSortValue = localStorage.getItem(`${window.chatUserName}-sortValue`);
if (storedSortValue && sortSelect) {
sortSelect.value = storedSortValue;
logDebug(`Loaded sort value: ${storedSortValue}`);
} else if (sortSelect) { // If no stored value, ensure UI is default
sortSelect.value = "original";
}

// Feature 6: Load window.ytapiNextpagetokko state
const storedYtapiNextpagetokko = localStorage.getItem(`${window.chatUserName}-ytapiNextpagetokko`);
if (storedYtapiNextpagetokko !== null) {
window.ytapiNextpagetokko = storedYtapiNextpagetokko;
logDebug(`Loaded window.ytapiNextpagetokko: ${window.ytapiNextpagetokko}`);
} else {
window.ytapiNextpagetokko = "false"; // Default value
logDebug("window.ytapiNextpagetokko not found, defaulting to 'false'.");
}

// Update window.maxresults based on loaded ytapiNextpagetokko
// The actual fetching logic in getInitialVideoIdsPromise now primarily uses ytapiNextpagetokko
// to control if it continues fetching pages or stops after the first `maxResultsPerRequest` (50).
// This `window.maxresults` variable is less critical for the looping logic but might be used elsewhere.
window.maxresults = (window.ytapiNextpagetokko === "true") ? 50 : 25;

// Update the UI for the toggle button
toggleVidLimitBtn = document.getElementById("toggle-vid-limit-btn");
if (toggleVidLimitBtn) {
toggleVidLimitBtn.textContent = (window.ytapiNextpagetokko === "true") ? "all vids" : "50 vids";
}

window.applyFiltersAndSorting();
logDebug("Settings loaded and applied.");
};

/**
* Saves application settings (playlist mode, filter, sort, video limit) to local storage.
*/
window.saveSettings = function() {
// Task 3: playlistModeSelect is now static. Get it.
playlistModeSelect = document.getElementById("playlist-mode-select");
if (playlistModeSelect) {
localStorage.setItem(`${window.chatUserName}-playlistMode`, playlistModeSelect.value);
}
if (filterInput && filterInput.value) { // Only save if there's a value
localStorage.setItem(`${window.chatUserName}-filterText`, filterInput.value);
} else { // Remove from storage if input is empty
localStorage.removeItem(`${window.chatUserName}-filterText`);
}
if (sortSelect && sortSelect.value !== "original") { // Only save if not default
localStorage.setItem(`${window.chatUserName}-sortValue`, sortSelect.value);
} else { // Remove from storage if default
localStorage.removeItem(`${window.chatUserName}-sortValue`);
}
// Feature 6: Save window.ytapiNextpagetokko state
localStorage.setItem(`${window.chatUserName}-ytapiNextpagetokko`, window.ytapiNextpagetokko);
logDebug("Settings saved to local storage.");
};

// --- Sleep Timer functionality ---
document.addEventListener("DOMContentLoaded", () => {
// Create sleep timer input and start button dynamically if not in HTML
sleepTimerInput = document.getElementById("sleep-timer-input");
startTimerBtn = document.getElementById("start-timer-btn");

if (!sleepTimerInput) {
sleepTimerInput = document.createElement("input");
sleepTimerInput.type = "number";
sleepTimerInput.id = "sleep-timer-input";
sleepTimerInput.placeholder = "Minutes";
logDebug("Dynamically created sleepTimerInput.");
}
if (!startTimerBtn) {
startTimerBtn = document.createElement("button");
startTimerBtn.textContent = "Sleep!";
startTimerBtn.id = "start-timer-btn";
logDebug("Dynamically created startTimerBtn.");
}

if (window.toggleBtnGroup) {
if (!window.toggleBtnGroup.contains(sleepTimerInput)) window.toggleBtnGroup.appendChild(sleepTimerInput);
if (!window.toggleBtnGroup.contains(startTimerBtn)) window.toggleBtnGroup.appendChild(startTimerBtn);
logDebug("Sleep timer elements appended to toggleBtnGroup.");
} else {
logError("toggleBtnGroup not found to append sleep timer elements.");
}

let countdownInterval;

if (startTimerBtn) {
startTimerBtn.addEventListener("click", () => {
const existingTimerDisplay = document.querySelector("#timer-display");
if (existingTimerDisplay) {
existingTimerDisplay.remove();
}
const timerDuration = parseInt(sleepTimerInput.value);

if (isNaN(timerDuration) || timerDuration <= 0) {
alert("Please enter a positive number for the timer duration.");
logWarn("Invalid sleep timer duration entered.");
return;
}

let remainingTime = timerDuration * 60; // Convert minutes to seconds

const timerDisplay = document.createElement("span");
timerDisplay.id = "timer-display";
if (sleepTimerInput && sleepTimerInput.parentNode) {
sleepTimerInput.parentNode.insertBefore(
timerDisplay, sleepTimerInput.nextSibling
);
timerDisplay.style.marginLeft = "5px"; // Add some spacing
}

// Update the timer display immediately
updateTimerDisplay();

// Clear any existing interval
if (countdownInterval) {
clearInterval(countdownInterval);
countdownInterval = null;
}

// Start the countdown timer
countdownInterval = setInterval(() => {
remainingTime--;
updateTimerDisplay();

if (remainingTime <= 0) {
clearInterval(countdownInterval);
countdownInterval = null; // Clear interval ID
if (window.player) {
window.player.stopVideo();
}
logDebug("Sleep timer finished. Player stopped.");
timerDisplay.textContent = ""; // Clear the display
sleepTimerInput.value = ""; // Clear input after timer
}
}, 1000);

function updateTimerDisplay() {
const minutes = Math.floor(remainingTime / 60);
const seconds = remainingTime % 60;
timerDisplay.textContent = `${minutes
.toString()
.padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
logDebug(`Sleep timer started for ${timerDuration} minutes.`);
});
}
});

/**
* Adds one or more video IDs to the playlist. Fetches video details from YouTube API
* in batches.
* @param {string[]} videoIds - An array of video IDs to add.
* @returns {Promise<void>} A promise that resolves when all videos are added and the playlist is rendered.
*/
window.addVideosToPlaylist = async function(videoIds) {
if (!Array.isArray(videoIds) || videoIds.length === 0) {
logDebug("addVideosToPlaylist called with no video IDs.");
return;
}
logDebug(`Attempting to add ${videoIds.length} videos to playlist.`);

const newVideoIds = videoIds.filter(id => !window.currentPlaylist.includes(id));
if (newVideoIds.length === 0) {
logDebug("All provided videos are already in the playlist, skipping adding.");
return;
}

const BATCH_SIZE = 50; // YouTube API maxResults is 50
let videoDetailsPromises = [];

for (let i = 0; i < newVideoIds.length; i += BATCH_SIZE) {
const batch = newVideoIds.slice(i, i + BATCH_SIZE);
const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${batch.join(',')}&key=${window.apiKey}`;
videoDetailsPromises.push( fetch(url).then(response => {
if (!response.ok) {
throw new Error(`HTTP error! status: ${response.status}`);
}
return response.json();
}).then(data => {
if (data.error) {
logError("YouTube API error for batch:", data.error);
return [];
}
return data.items.map(item => ({ id: item.id, title: item.snippet.title, duration: window.formatDuration(item.contentDetails.duration) }));
}).catch(error => {
logError("Error fetching video details for batch:", batch, error);
return [];
})
);
}

try {
const allFetchedDetails = (await Promise.all(videoDetailsPromises)).flat();

allFetchedDetails.forEach(videoDetail => {
if (!window.currentPlaylist.includes(videoDetail.id)) {
window.currentPlaylist.push(videoDetail.id);
window.currentPlaylistDetails.push(videoDetail);
}
});
// Feature 6: Apply the current limit after adding new videos
// This ensures that if the limit is 50, only the first 50 are shown/kept for the primary playlist view
if (window.ytapiNextpagetokko === "false" && window.currentPlaylistDetails.length > 50) {
window.currentPlaylistDetails = window.currentPlaylistDetails.slice(0, 50);
window.currentPlaylist = window.currentPlaylist.slice(0, 50);
logDebug("Trimmed playlist to 50 videos due to '50 vids' mode.");
}

window.savePlaylistToLocalStorage();
// window.renderPlaylist(); // Render is handled by applyFiltersAndSorting which is called in loadSettings later
logDebug(`Successfully added ${allFetchedDetails.length} new videos to playlist.`);
} catch (error) {
logError("Error processing all video details:", error);
}
};

/**
* Fetches the name of a YouTube playlist.
* @param {string} playlistId - The ID of the YouTube playlist.
* @param {string} apiKey - Your YouTube Data API key.
* @returns {Promise<string|null>} A promise that resolves to the playlist title or null if not found/error.
*/
window.getYouTubePlaylistName = async function(playlistId, apiKey) {
try {
const response = await fetch(
`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
);
const data = await response.json();

if (data.error) {
logError("Error fetching playlist name:", data.error);
return null;
}

if (data.items && data.items.length > 0) {
return data.items[0].snippet.title;
} else {
logWarn("Playlist name not found for ID:", playlistId);
return null;
}
} catch (error) {
logError("Error fetching playlist name:", error);
return null;
}
};

// --- Reset Playlist Progress functionality ---
document.addEventListener("DOMContentLoaded", () => {
// Create Reset Progress button dynamically if not in HTML
// No longer dynamically created here, it exists in index.html with _new ID
const resetProgressBtn = document.getElementById("reset-progress-btn_new"); // Get the new button from index.html

if (resetProgressBtn) {
resetProgressBtn.addEventListener("click", () => {
window.resetPlaylistProgress();
});
logDebug("Reset progress button event listener attached.");
} else {
logWarn("Reset progress button #reset-progress-btn_new not found.");
}
});

/**
* Resets the saved playback progress for all videos in the current playlist.
*/
window.resetPlaylistProgress = function() {
logDebug("Resetting playlist progress for all videos.");

window.currentPlaylist.forEach((videoId) => {
window.removePlaylistProgress(videoId); // Remove progress from local storage
});

window.renderPlaylist(); // Re-render to reflect changes
logDebug("Playlist progress reset.");
};

// --- Playlist Mode Selection functionality ---
document.addEventListener("DOMContentLoaded", () => {
// Task 3: playlistModeSelect is now static. Get it.
playlistModeSelect = document.getElementById("playlist-mode-select");

// Removed dynamic creation logic for playlistModeSelect
// It is now placed statically in index.html, replacing "free2" button.

if (playlistModeSelect) {
playlistModeSelect.addEventListener("change", () => {
logDebug("Playlist mode changed to:", playlistModeSelect.value);
window.saveSettings();
});
logDebug("Playlist mode select event listener attached.");
} else {
logError("playlist-mode-select element not found in DOM.");
}
});

// --- Playlist Item Selection Mode functionality ---
document.addEventListener("DOMContentLoaded", () => {
// Select Toggle button is now expected to be in index.html (or dynamically handled there)
// Let's ensure it's fetched correctly.
selectToggleBtn = document.getElementById("select-toggle-btn");
if (!selectToggleBtn) { // Fallback to dynamic creation if not found statically (though prompt implies it's static)
selectToggleBtn = document.createElement("button");
selectToggleBtn.textContent = "Select";
selectToggleBtn.id = "select-toggle-btn";
if (window.toggleBtnGroup) { // toggleBtnGroup is exposed globally from main-app.js
if (!window.toggleBtnGroup.contains(selectToggleBtn)) window.toggleBtnGroup.appendChild(selectToggleBtn);
}
logDebug("Dynamically created selectToggleBtn (fallback).");
}

if (selectToggleBtn) {
selectToggleBtn.addEventListener("click", () => {
selectionMode = !selectionMode;
selectToggleBtn.textContent = selectionMode ? "Exit Select" : "Select";
logDebug(`Selection mode toggled to: ${selectionMode}`);
window.renderPlaylist(); // Re-render to show/hide checkboxes
});
logDebug("Select toggle button event listener attached.");
}
});

// Feature 5: Clear Playlist
/**
* Clears videos from the playlist. If in selection mode, only clears selected videos.
* Otherwise, clears all videos.
* @param {boolean} [selectedOnly=false] - If true, only remove selected items.
*/
window.clearPlaylist = function() {
logDebug("Clear playlist function called.");
let videosToRemove = [];

if (selectionMode) {
// If selection mode is active, collect selected video IDs
videosToRemove = Array.from(window.playlistElement.querySelectorAll("li.selected"))
.map(li => li.dataset.videoId)
.filter(id => id);
if (videosToRemove.length === 0) {
alert("No videos selected to clear. If you want to clear all, exit selection mode first.");
logDebug("Clear playlist: No selected videos found.");
return;
}
logDebug(`Clear playlist: Removing ${videosToRemove.length} selected videos.`);
} else {
// If not in selection mode, confirm and clear all
if (!confirm("Are you sure you want to clear ALL videos from the playlist?")) {
logDebug("Clear playlist: Action cancelled by user.");
return;
}
videosToRemove = [...window.currentPlaylist]; // Copy all current video IDs
logDebug(`Clear playlist: Removing all ${videosToRemove.length} videos.`);
}

// Task 4: Desynchronization - If active video is among those being removed or
// its index changes, ensure currentVideoIndex is adjusted or reset.
const currentPlayingVideoId = window.player && typeof window.player.getVideoData === 'function' ? window.player.getVideoData()?.video_id : null;
let nextVideoToPlay = null;

videosToRemove.forEach(videoId => {
// removeVideoFromPlaylist already handles splicing and local storage updates
window.removeVideoFromPlaylist(videoId);
});

// After all removals, re-evaluate the active video state
if (currentPlayingVideoId && !window.currentPlaylist.includes(currentPlayingVideoId)) {
// If the currently playing video was removed, stop it
if (window.player && typeof window.player.stopVideo === 'function') {
window.player.stopVideo();
}
window.currentVideoIndex = -1;
logDebug("Currently playing video was removed, stopping player and resetting index.");
} else if (currentPlayingVideoId && window.currentPlaylist.includes(currentPlayingVideoId)) {
// If the currently playing video is still in the playlist, update its index
const newIndex = window.currentPlaylist.indexOf(currentPlayingVideoId);
if (newIndex !== -1) {
window.currentVideoIndex = newIndex;
window.highlightActivePlaylistItem();
logDebug(`Active video still in playlist, updated index to ${newIndex}.`);
} else {
// Should not happen if previous `includes` check passed
logWarn("Logic error: currentPlayingVideoId includes but indexOf returns -1 after removal loop.");
}
} else if (window.currentPlaylist.length > 0) {
// If no video was playing or active video was not in `videosToRemove`,
// and playlist still has videos, try to play the first one if player is idle
if (window.playerReady && (typeof window.player.getPlayerState !== 'function' || (window.player.getPlayerState() !== YT.PlayerState.PLAYING && window.player.getPlayerState() !== YT.PlayerState.PAUSED))) {
window.playVideo(window.currentPlaylist[0], 0);
logDebug("Cleared playlist, starting first video as player was idle.");
}
} else {
// Playlist is now completely empty
if (window.player && typeof window.player.stopVideo === 'function') {
window.player.stopVideo();
}
window.currentVideoIndex = -1;
logDebug("Playlist is now empty, player stopped and index reset.");
}

window.savePlaylistToLocalStorage(); // Ensure local storage is updated after removals
window.renderPlaylist(); // Re-render to reflect changes if any
alert("Playlist cleared successfully!");
};

// Feature 6: Toggle "All Vids" / "50 Vids"
document.addEventListener("DOMContentLoaded", () => {
toggleVidLimitBtn = document.getElementById("toggle-vid-limit-btn");
if (toggleVidLimitBtn) {
toggleVidLimitBtn.addEventListener("click", () => {
window.toggleVideoLimit();
});
logDebug("Toggle video limit button event listener attached.");
} else {
logWarn("Toggle video limit button #toggle-vid-limit-btn not found.");
}
});

/**
* Toggles the video display/import limit between "all vids" (true) and "50 vids" (false).
*/
window.toggleVideoLimit = function() {
window.ytapiNextpagetokko = (window.ytapiNextpagetokko === "true") ? "false" : "true";

// Update window.maxresults if applicable for single-page fetches in future,
// though getInitialVideoIdsPromise loop condition mainly uses ytapiNextpagetokko.
window.maxresults = (window.ytapiNextpagetokko === "true") ? 50 : 25; // 25 is a reasonable default for limited view, YouTube API max is 50.

if (toggleVidLimitBtn) {
toggleVidLimitBtn.textContent = (window.ytapiNextpagetokko === "true") ? "all vids" : "50 vids";
}
logDebug(`Video limit toggled to: ${window.ytapiNextpagetokko}. maxresults set to: ${window.maxresults}`);

window.saveSettings(); // Persist the new state

// If switching to "50 vids", trim the current playlist if it exceeds the limit
if (window.ytapiNextpagetokko === "false" && window.currentPlaylistDetails.length > 50) {
logDebug("Trimming current playlist to 50 videos due to toggle.");
window.currentPlaylistDetails = window.currentPlaylistDetails.slice(0, 50);
window.currentPlaylist = window.currentPlaylist.slice(0, 50);
window.savePlaylistToLocalStorage();
window.renderPlaylist();
// If current playing video is beyond the 50 limit, stop and play the first one
if (window.currentVideoIndex >= 50 && window.currentPlaylist.length > 0) {
logDebug("Currently playing video is beyond the 50 limit, restarting playlist.");
window.playVideo(window.currentPlaylist[0], 0);
} else if (window.currentVideoIndex === -1 && window.currentPlaylist.length > 0) {
// If nothing playing and playlist was trimmed, just show the new list
// No need to play a video unless explicitly requested or player is idle.
}
} else {
// If switching to "all vids" or if playlist is already <= 50, just re-render.
// If original playlist was already longer than 50 and it was in "50 vids" mode,
// switching to "all vids" needs a full re-fetch or re-loading of the original list.
// This is handled by `getInitialVideoIdsPromise` and `addVideosToPlaylist` implicitly,
// but for an *already loaded* playlist, we need a way to restore the full list
// if `originalPlaylistDetails` exists and has more items.
if (window.ytapiNextpagetokko === "true" && window.originalPlaylistDetails.length > window.currentPlaylistDetails.length) {
// This is a complex scenario. The most robust way would be to re-fetch the entire playlist from source
// if it was a PL ID, or indicate to the user they need to re-import.
// For now, let's just re-render what we have, assuming `addVideosToPlaylist` will handle
// extending the list if new videos are added.
// A more complete solution would require storing the 'full' playlist separately
// from the 'displayed' playlist when in '50 vids' mode.
logWarn("Switching to 'all vids' with a potentially trimmed internal list. Consider a re-import if full list is not visible.");
}
window.renderPlaylist(); // Re-render to update any visual state if necessary
}

alert(`Video limit set to: ${(window.ytapiNextpagetokko === "true") ? "Unlimited" : "50 Videos"}`);
};


/**
* Recommends YouTube videos based on a given video using the Gemini API.
* @param {string} videoName - The name of the video to base recommendations on.
* @param {string} videoId - The ID of the video to base recommendations on.
* @returns {Promise<string|null>} A promise that resolves to a comma-separated string of recommended video IDs, or null on error.
*/
window.recommendVideos = async function(videoName, videoId) {
if (!window.geminiApiKey) {
logWarn("Gemini API key is required to recommend videos.");
alert(
"Gemini API key is required. Please provide it in the URL parameter '&keygemini='."
);
return null;
}

const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${window.geminiApiKey}`;
const promptText = `Recommend 10 longer YouTube videos based on the video "${videoName}" with ID "${videoId}". Provide only comma-separated YouTube video IDs without spaces.`;
logDebug("Prompt Text to Gemini API:", promptText);

try {
const response = await fetch(geminiApiUrl,{ method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
contents: [
{
role: "user",
parts: [{ text: promptText }]
}
]
})
});

if (!response.ok) {
logError("Gemini API error:", response.status, response.statusText);
throw new Error(
`Gemini API error: ${response.status} ${response.statusText}`
);
}

const data = await response.json();
logDebug("Gemini API Raw Response:", data);

if (
!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0
) {
logWarn("No candidates or content returned from Gemini API.");
return null;
}

let recommendedVideoIds = data.candidates[0].content.parts[0].text.trim();
recommendedVideoIds = recommendedVideoIds.replace(/\s/g, ""); // Remove spaces
logDebug("Recommended Video IDs from Gemini:", recommendedVideoIds);

if (window.videoIdInput) {
window.videoIdInput.value = recommendedVideoIds;
logDebug("Video IDs inserted into the video ID input field.");
} else {
logWarn("No video ID input field found to insert recommended video IDs.");
}

return recommendedVideoIds;
} catch (error) {
logError("Error querying Gemini API:", error);
alert(`Error querying Gemini API: ${error.message}`);
return null;
}
};

/**
* Renders the current playlist in the DOM.
*/
window.renderPlaylist = function() {
logDebug("Rendering playlist with", window.currentPlaylistDetails.length, "items.");
if (!window.playlistElement) {
logError("Playlist element not found, cannot render.");
return;
}
window.playlistElement.innerHTML = "";
// originalPlaylistDetails is updated in loadSettings to ensure a stable base for filtering/sorting.

window.currentPlaylistDetails.forEach((video, index) => {
const videoId = video.id;
const lastPos = window.getPlaylistProgress(videoId);
const lastPosFormatted = lastPos > 0 ? window.iso8601Duration(lastPos) + " / " : "";

const li = document.createElement("li");
li.innerHTML = `
<input type="checkbox" data-video-id="${videoId}" ${
selectionMode ? "" : 'style="display:none;"'
}>
<span>${index + 1}. ${
video.title
} <span class="current-time">${lastPosFormatted}${
video.duration
}</span></span>
<button class="ask-ai-btn" data-video-id="${video.id}" data-video-name="${
video.title
}" title="Ask AI">🍤</button>
<button class="download-video-btn" data-video-id="${
video.id
}" title="Download">💾</button>
<button class="remove-video-btn" data-video-id="${
video.id
}" title="Remove">✖</button>
`;
li.dataset.videoId = videoId;
li.dataset.playlistPosition = index;

if (selectionMode) {
window.addPlaylistItemSelectionListener(li);
} else {
window.addPlaylistItemPlayListener(li, videoId, index);
}
window.playlistElement.appendChild(li);
});

document.querySelectorAll(".remove-video-btn").forEach((button) => {
button.addEventListener("click", (e) => {
e.stopPropagation();
const videoIdToRemove = e.target.dataset.videoId;
logDebug("Remove video button clicked for:", videoIdToRemove);
window.removeVideoFromPlaylist(videoIdToRemove);
});
});

const setDownloadResolution = (resolution) => {
return resolution || 360
}

document.querySelectorAll(".download-video-btn").forEach((button) => {
button.addEventListener("click", (e) => {
logDebug('download-video-btn clicked for video ID:', e.target.dataset.videoId);
e.stopPropagation();
const videoId = e.target.dataset.videoId;
const downloadUrl = `yt-save-clip.html?ytid=${videoId}&f=${setDownloadResolution(360)}`;
window.open(downloadUrl, "_blank");
logDebug(`Opening download URL: ${downloadUrl}`);
});
});

document.querySelectorAll(".ask-ai-btn").forEach((button) => {
button.addEventListener("click", async (e) => {
e.stopPropagation(); // Prevent playing the video
const videoId = button.dataset.videoId;
const videoName = button.dataset.videoName;
logDebug(
`Asking AI for recommendations for video: ${videoName} (${videoId})`
);
await window.recommendVideos(videoName, videoId);
});
});

logDebug("Playlist rendering complete.");
window.highlightActivePlaylistItem();
};

/**
* Removes a video from the playlist.
* @param {string} videoId - The ID of the video to remove.
* Task 4: Updates currentVideoIndex to maintain synchronization.
*/
window.removeVideoFromPlaylist = function(videoId) {
logDebug("Removing video from playlist:", videoId);
const indexToRemove = window.currentPlaylist.indexOf(videoId);
if (indexToRemove > -1) {
window.currentPlaylist.splice(indexToRemove, 1);
window.currentPlaylistDetails.splice(indexToRemove, 1);
logDebug(`Video ID ${videoId} removed from playlist at position ${indexToRemove}.`);
window.savePlaylistToLocalStorage();
window.removePlaylistProgress(videoId);

// Task 4: Adjust currentVideoIndex if the deleted video affects it
if (window.currentVideoIndex > -1) {
if (indexToRemove < window.currentVideoIndex) {
window.currentVideoIndex--; // Decrement if an item before the active one was deleted
logDebug(`currentVideoIndex decremented to ${window.currentVideoIndex} due to item removal before it.`);
} else if (indexToRemove === window.currentVideoIndex) {
// The active video was deleted. Keep currentVideoIndex the same (it now points to the next item)
// or reset if playlist becomes empty.
if (window.currentPlaylist.length === 0) {
window.currentVideoIndex = -1;
if (window.player && typeof window.player.stopVideo === 'function') {
window.player.stopVideo();
}
logDebug("Active video removed, playlist empty, index reset.");
} else {
// If not empty, currentVideoIndex effectively points to the new item at that position.
// playNextVideo will handle starting the next video if the player was playing the removed one.
logDebug("Active video removed, currentVideoIndex now points to the next item in sequence.");
}
}
}
// Re-render is often called externally, but for single removals, it helps.
// However, if called in a loop (like clearPlaylist), it's better to render once at the end.
// window.renderPlaylist();

// The logic to play the next video if the current one was removed is already in `removeVideoFromPlaylist`.
// This is fine.
if (window.player && window.player.getVideoData && window.player.getVideoData()?.video_id === videoId) {
logDebug("Removed video was currently playing, attempting to play next video.");
window.playNextVideo(); // This will also update `currentVideoIndex` and `highlightActivePlaylistItem`.
} else if (window.currentVideoIndex > -1 && window.currentPlaylist.length > 0) {
// If the removed video was not the playing one, but we need to re-highlight based on new currentVideoIndex
window.highlightActivePlaylistItem();
} else if (window.currentPlaylist.length === 0) {
window.highlightActivePlaylistItem(); // Clears highlights if playlist empty
}

} else {
logDebug(`Video ID ${videoId} not found in playlist to remove.`);
}
};

/**
* Plays the next video in the playlist. Loops to the beginning if at the end.
* Feature 2: Resume Playback from Stored Duration
*/
window.playNextVideo = function() {
logDebug("Playing next video.");
if (!window.player || typeof window.player.getVideoData !== 'function' || window.currentPlaylist.length === 0) {
logDebug("Cannot play next video: player not ready, no video data, or playlist empty.");
if (window.player && typeof window.player.stopVideo === 'function') {
window.player.stopVideo(); // Stop if no next video can be played
}
window.currentVideoIndex = -1; // Reset index if no video to play
window.highlightActivePlaylistItem(); // Clear highlight
return;
}

const currentPlayingVideoId = window.player.getVideoData()?.video_id;
let currentVideoIndexInPlaylist = window.currentPlaylist.indexOf(currentPlayingVideoId);

if (currentVideoIndexInPlaylist === -1) {
logWarn("playNextVideo: Currently playing video not found in currentPlaylist, falling back to last known index.");
window.currentVideoIndex = (window.currentVideoIndex + 1) % window.currentPlaylist.length;
} else {
window.currentVideoIndex = (currentVideoIndexInPlaylist + 1) % window.currentPlaylist.length;
}

const nextVideoId = window.currentPlaylist[window.currentVideoIndex];
// Feature 2: Resume from stored duration
const startSeconds = window.getPlaylistProgress(nextVideoId);
window.playVideo(nextVideoId, window.currentVideoIndex, startSeconds);
};

/**
* Saves the current playlist (details) to local storage.
*/
window.savePlaylistToLocalStorage = function() {
logDebug("Saving playlist to local storage.");
// Store entire currentPlaylistDetails (full video objects) instead of just IDs
// This helps restore titles/durations without re-fetching API
const playlistToSave = window.currentPlaylistDetails.map((video) => ({
id: video.id,
title: video.title,
duration: video.duration, // You can add more properties here if needed for full restore
}));

localStorage.setItem(window.localStorageKey, JSON.stringify(playlistToSave));
logDebug(`Playlist saved to local storage (${window.localStorageKey}) with ${playlistToSave.length} items.`);
};

/**
* Saves the currently active playlist item's video ID, position in playlist, and playback time.
*/
window.saveActivePlaylistItem = function() {
if (window.currentVideoIndex !== -1 && window.player && typeof window.player.getVideoData === 'function' && window.player.getVideoData()) {
const videoId = window.player.getVideoData().video_id;
const position = Math.round(window.player.getCurrentTime());
const activeItem = { videoId: videoId, playlistPosition: window.currentVideoIndex, position: position };
localStorage.setItem(window.activePlaylistKey, JSON.stringify(activeItem));
logDebug(
"Active playlist item saved to local storage:", activeItem, window.activePlaylistKey
);
} else {
logDebug("Could not save active playlist item (no video playing or index invalid).");
}
};

/**
* Restores the active playlist item from local storage and plays it.
*/
window.restoreActivePlaylistItem = function() {
const storedActiveItem = localStorage.getItem(window.activePlaylistKey);
if (storedActiveItem) {
const activeItem = JSON.parse(storedActiveItem);
logDebug("Active playlist item restored from local storage:", activeItem);

// Ensure that the restored videoId is actually in the current playlist
const actualIndex = window.currentPlaylist.indexOf(activeItem.videoId);
if (actualIndex !== -1) {
window.setActivePlaylistItem(
activeItem.videoId,
actualIndex, // Use actual index in current playlist
activeItem.position
);
} else {
logWarn(`Restored video ID ${activeItem.videoId} not found in current playlist.`);
// Fallback: play the first video or do nothing if (window.currentPlaylist.length > 0)
if (window.currentPlaylist.length > 0) {
window.playVideo(window.currentPlaylist[0], 0);
}
}

} else {
logDebug("No active playlist item found in local storage to restore.");
}
};

/** Clears the 'active' class from all playlist items. */
window.clearHighlight = function() {
document.querySelectorAll("#playlist li").forEach((li) => {
li.classList.remove("active");
});
};

/** Highlights the currently active playlist item and scrolls it into view. */
window.highlightActivePlaylistItem = function() {
window.clearHighlight();
if (window.currentVideoIndex !== -1) {
const playlistItems = document.querySelectorAll("#playlist li");
if (playlistItems[window.currentVideoIndex]) {
playlistItems[window.currentVideoIndex].classList.add("active");
// Scroll into view if not already visible
playlistItems[window.currentVideoIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
} else {
logWarn(`Playlist item at index ${window.currentVideoIndex} not found to highlight.`);
}
}
};

/**
* Loads and plays a video from the playlist.
* @param {string} videoId - The ID of the video to play.
* @param {number} index - The index of the video in the current playlist.
* @param {number} [startSeconds=0] - The time in seconds to start playback from.
*/
window.playVideo = function(videoId, index, startSeconds = 0) {
if (window.playerReady && window.player && typeof window.player.loadVideoById === 'function') {
logDebug(
"Playing video by ID:", videoId, "at index:", index, "from:", startSeconds
);
window.currentVideoIndex = index;
window.player.loadVideoById({ videoId: videoId, startSeconds: startSeconds });
window.renderPlaylist();
logDebug("Player loading video:", videoId);

const savedCaptionLanguage = localStorage.getItem(`${window.chatUserName}-captionLanguage`);
if (savedCaptionLanguage) {
window.setCaptionLanguageAPI(savedCaptionLanguage);
logDebug(`Applied saved caption language: ${savedCaptionLanguage}`);
}

const savedVideoQuality = localStorage.getItem(`${window.chatUserName}-videoQuality`);
if (savedVideoQuality) {
window.setVideoQualityAPI(savedVideoQuality);
logDebug(`Applied saved video quality: ${savedVideoQuality}`);
}

window.highlightActivePlaylistItem();
window.saveActivePlaylistItem();

if (window.timeUpdateInterval) {
clearInterval(window.timeUpdateInterval);
}
window.timeUpdateInterval = setInterval(() => {
window.updateActivePlaylistItem();
window.updateUrlWithActiveVid();
}, window.updateTimeURL);
} else {
logError("YouTube player is not ready yet or player object is null, cannot play video.");
}
};

/**
* Updates the display of the active playlist item and saves its progress and URL state.
*/
window.updateActivePlaylistItem = function() {
if (window.player && typeof window.player.getVideoData === 'function' && window.player.getVideoData() && window.currentVideoIndex !== -1) {
const videoData = window.player.getVideoData();
const videoId = videoData.video_id;
const currentTime = window.player.getCurrentTime();
const formattedCurrentTime = window.iso8601Duration(currentTime);

window.updatePlaylistItemDisplay(formattedCurrentTime); // Update display in playlist
window.savePlaylistProgress(videoId, currentTime);
window.saveActivePlaylistItem();
// window.updateUrlWithActiveVid(); // This is called by the interval directly
} else {
logDebug("Cannot update active playlist item: player not ready, no video data, or invalid index.");
}
};

/**
* Sets an item as the active playing item and starts playback.
* @param {string} videoId - The ID of the video.
* @param {number} playlistPosition - The position in the playlist.
* @param {number} position - The start time in seconds.
*/
window.setActivePlaylistItem = function(videoId, playlistPosition, position) {
if (window.playerReady && window.player) {
logDebug(
`Setting active playlist item: videoId=${videoId}, position=${position}`
);
window.currentVideoIndex = playlistPosition;
window.player.loadVideoById(videoId, position);
window.highlightActivePlaylistItem();
window.updateActivePlaylistItem();
window.saveActivePlaylistItem();
} else {
logError("YouTube player is not ready yet or player object is null, cannot set active playlist item.");
}
};

/**
* Sets the active playlist item from URL parameters, handling player readiness.
* @param {string} videoId - The video ID from the URL.
* @param {number} playlistPosition - The playlist position from the URL.
* @param {number} position - The start time in seconds from the URL.
*/
window.setActivePlaylistItemFromUrl = function(videoId, playlistPosition, position) {
logDebug(
`Setting active playlist item from URL: videoId=${videoId}, playlistPosition=${playlistPosition}, position=${position}`
);
if (window.currentPlaylist.includes(videoId)) {
window.currentVideoIndex = playlistPosition;
window.highlightActivePlaylistItem();
// window.updateActivePlaylistItem(); // Will be called by setActivePlaylistItem

if (window.playerReady) {
window.setActivePlaylistItem(videoId, playlistPosition, position);
} else {
logDebug("Player not ready yet, delaying setActivePlaylistItemFromUrl.");
const intervalId = setInterval(() => {
if (window.playerReady) {
clearInterval(intervalId);
window.setActivePlaylistItem(videoId, playlistPosition, position);
}
}, 500); // Check every 500ms
}
} else {
logWarn(`Video ID ${videoId} from URL not found in current playlist.`);
if (window.currentPlaylist.length > 0 && window.playerReady) {
logDebug("Playing first video in playlist as URL video not found.");
window.playVideo(window.currentPlaylist[0], 0);
}
}
};

/**
* Updates the displayed current time and duration for the active playlist item in the UI.
* @param {string} formattedCurrentTime - The formatted current playback time.
*/
window.updatePlaylistItemDisplay = function(formattedCurrentTime) {
const playlistItems = document.querySelectorAll("#playlist li");
if (window.currentVideoIndex !== -1 && playlistItems[window.currentVideoIndex]) {
const currentPlayingVideoData = window.player && typeof window.player.getVideoData === 'function' ? window.player.getVideoData() : null;
const videoId = currentPlayingVideoData ? currentPlayingVideoData.video_id : null;

if (videoId && window.currentPlaylistDetails[window.currentVideoIndex] && window.currentPlaylistDetails[window.currentVideoIndex].id === videoId) {
const currentTimeSpan = playlistItems[window.currentVideoIndex].querySelector(
".current-time"
);
if (currentTimeSpan) {
const videoDuration = window.currentPlaylistDetails[window.currentVideoIndex].duration;
currentTimeSpan.textContent = ` ${formattedCurrentTime} / ${videoDuration}`;
}
} else {
logWarn(
`Cannot update display for playlist item: videoId mismatch or currentPlaylistDetails[${window.currentVideoIndex}] is undefined. Current Video ID: ${videoId}, Expected Video ID: ${window.currentPlaylistDetails[window.currentVideoIndex]?.id}`
);
}
}
};

/**
* Saves the playback progress for a specific video to local storage.
* @param {string} videoId - The ID of the video.
* @param {number} position - The playback position in seconds.
*/
window.savePlaylistProgress = function(videoId, position) {
let progress = JSON.parse(localStorage.getItem(window.playlistProgressKey) || "{}");
position = Math.round(position);
progress[videoId] = position;

localStorage.setItem(window.playlistProgressKey, JSON.stringify(progress));
logDebug(`Saved progress for video ${videoId} at position ${position}`);
};

/**
* Retrieves the saved playback progress for a specific video from local storage.
* @param {string} videoId - The ID of the video.
* @returns {number} The saved playback position in seconds, or 0 if not found.
*/
window.getPlaylistProgress = function(videoId) {
let progress = JSON.parse(localStorage.getItem(window.playlistProgressKey) || "{}");
return progress[videoId] || 0;
};

/**
* Removes the saved playback progress for a specific video from local storage.
* @param {string} videoId - The ID of the video.
*/
window.removePlaylistProgress = function(videoId) {
let progress = JSON.parse(localStorage.getItem(window.playlistProgressKey) || "{}");
delete progress[videoId];
localStorage.setItem(window.playlistProgressKey, JSON.stringify(progress));
logDebug(`Removed progress for video ${videoId}`);
};

/** Loads all playlist progress data from local storage (primarily for logging/debugging). */
window.loadPlaylistProgress = function() {
let progress = JSON.parse(localStorage.getItem(window.playlistProgressKey) || "{}");
logDebug("Loaded playlist progress:", Object.keys(progress).length, "items.");
};

// --- Helper functions for playlist item creation ---

/**
* Creates a checkbox element for a playlist item.
* @param {string} videoId - The ID of the video.
* @returns {HTMLInputElement} The created checkbox element.
*/
function createPlaylistItemCheckbox(videoId) {
const checkbox = document.createElement("input");
checkbox.type = "checkbox";
checkbox.dataset.videoId = videoId;
checkbox.style.display = selectionMode ? "" : "none"; // Control visibility based on selectionMode
return checkbox;
}

/**
* Creates the action buttons (Ask AI, Download, Remove) for a playlist item.
* @param {string} videoId - The ID of the video.
* @param {string} videoTitle - The title of the video.
* @returns {HTMLDivElement} A div containing the buttons.
*/
function createPlaylistItemButtons(videoId, videoTitle) {
const buttons = document.createElement("div");

const askAiBtn = document.createElement("button");
askAiBtn.classList.add("ask-ai-btn");
askAiBtn.dataset.videoId = videoId;
askAiBtn.dataset.videoName = videoTitle;
askAiBtn.title = "Ask AI";
askAiBtn.textContent = "🍤";
buttons.appendChild(askAiBtn);

const downloadBtn = document.createElement("button");
downloadBtn.classList.add("download-video-btn");
downloadBtn.dataset.videoId = videoId;
downloadBtn.title = "Download";
downloadBtn.textContent = "💾";
buttons.appendChild(downloadBtn);

const removeBtn = document.createElement("button");
removeBtn.classList.add("remove-video-btn");
removeBtn.dataset.videoId = videoId;
removeBtn.title = "Remove";
removeBtn.textContent = "✖";
buttons.appendChild(removeBtn);

return buttons;
}

/**
* Attaches event listener for selection mode to a playlist item.
* @param {HTMLLIElement} li - The playlist list item element.
*/
window.addPlaylistItemSelectionListener = function(li) {
li.addEventListener("click", (e) => {
e.preventDefault();
e.stopPropagation();
const checkbox = li.querySelector('input[type="checkbox"]');
if (checkbox) {
checkbox.checked = !checkbox.checked;
li.classList.toggle("selected", checkbox.checked);
}

});
};

/**
* Attaches event listener for playing a video to a playlist item.
* @param {HTMLLIElement} li - The playlist list item element.
* @param {string} videoId - The ID of the video.
* @param {number} index - The index of the video in the playlist.
*/
window.addPlaylistItemPlayListener = function(li, videoId, index) {
li.addEventListener("click", () => {
logDebug("Playlist item clicked:", videoId, "at position:", index);
const startSeconds = window.getPlaylistProgress(videoId);
window.playVideo(videoId, index, startSeconds);
});
};

/**
* Simulates a click on the first playlist item, if available.
*/
window.clickFirstPlaylistItem = function() {
if (window.playlistElement && window.playlistElement.querySelectorAll("li").length > 0) {
window.playlistElement.querySelectorAll("li")[0].click();
logDebug("Clicked the first playlist item.");
} else {
logWarn("Cannot click first playlist item: playlist is empty.");
}
};

/**
* Callback function for when the YouTube player is ready.
* Handles initial playlist loading from URL, Local Storage, or YouTube API.
* This is globally exposed as onPlayerReady as required by YouTube Iframe API.
* @param {object} event - The player ready event.
* Task 5: Checks for and re-syncs active playlist item with player video if desynchronized.
*/
window.onPlayerReady = async function(event) {
logDebug("YouTube player is ready (window.onPlayerReady event).");
window.playerReady = true;

if (window.initialLoadComplete) {
logDebug("Initial load already complete, skipping playlist initialization.");
return;
}

// Load saved caption language and video quality
const savedCaptionLanguage = localStorage.getItem(`${window.chatUserName}-captionLanguage`);
if (savedCaptionLanguage) {
window.setCaptionLanguageAPI(savedCaptionLanguage);
logDebug(`Loaded caption language from local storage: ${savedCaptionLanguage}`);
}

const savedVideoQuality = localStorage.getItem(`${window.chatUserName}-videoQuality`);
if (savedVideoQuality) {
window.setVideoQualityAPI(savedVideoQuality);
logDebug(`Loaded video quality from local storage: ${savedVideoQuality}`);
}

const videoIdsToFetch = new Set(); // Use a Set to automatically handle duplicates

// Load general settings first to correctly set window.ytapiNextpagetokko and window.maxresults
window.loadSettings();

// 1. Collect all initial video IDs from various sources
if (window.initialPlaylistParam && window.initialPlaylistParam.startsWith("PL")) {
const playlistId = window.initialPlaylistParam;
logDebug("Fetching playlist from YouTube API for initial load:", playlistId);
try {
const fetchedIds = await window.getInitialVideoIdsPromise(playlistId, window.apiKey);
fetchedIds.forEach(id => videoIdsToFetch.add(id));
} catch (error) {
logError("Error processing initial playlist from YouTube API:", error);
}
} else if (window.initialPlaylistParam) {
window.initialPlaylistParam.split(",").forEach(id => videoIdsToFetch.add(id.trim()));
logDebug("Initial video IDs from URL (comma-separated):", Array.from(videoIdsToFetch));
} else if (localStorage.getItem(window.localStorageKey)) {
const storedPlaylist = JSON.parse(localStorage.getItem(window.localStorageKey));
logDebug("Initial playlist from local storage:", storedPlaylist.length, "items.");
if (storedPlaylist && Array.isArray(storedPlaylist)) {
storedPlaylist.forEach(item => {
if (item && item.id && !window.currentPlaylist.includes(item.id)) {
window.currentPlaylist.push(item.id);
window.currentPlaylistDetails.push({id: item.id, title: item.title, duration: item.duration});
videoIdsToFetch.delete(item.id);
} else if (item && item.id) {
videoIdsToFetch.delete(item.id);
}
});
}
} else {
logDebug("No initial playlist parameter or local storage data found.");
}

// Add any remaining collected videos (e.g., from URL that weren't in local storage)
if (videoIdsToFetch.size > 0) {
logDebug(`Adding ${videoIdsToFetch.size} videos not found in local storage.`);
await window.addVideosToPlaylist(Array.from(videoIdsToFetch));
} else if (window.currentPlaylist.length > 0) {
window.renderPlaylist(); // Render if playlist was loaded from local storage directly
}

window.loadPlaylistProgress();
// window.loadSettings() is already called above to setup ytapiNextpagetokko and maxresults


// --- Playlist Initialization Logic ---
window.currentVideoIndex = -1; // Reset index before attempting to load anything

// Attempt to initialize from URL parameter FIRST
if (window.activeVidParam) {
const [videoId, playlistPos, positionTime] = window.activeVidParam.split(",");
if (window.currentPlaylist.includes(videoId)) {
// setActivePlaylistItemFromUrl will set currentVideoIndex and play the video
window.setActivePlaylistItemFromUrl(videoId, parseInt(playlistPos), parseFloat(positionTime));
logDebug("Attempted to start video from activeVidParam.");
} else {
logWarn(`Video ID ${videoId} from activeVidParam not found in current playlist, skipping activeVid.`);
}
}

// If currentVideoIndex is still -1 (meaning activeVidParam failed or wasn't present),
// try restoring from local storage.
if (window.currentVideoIndex === -1) {
window.restoreActivePlaylistItem();
logDebug("Attempted to restore video from local storage (if activeVidParam not used or failed).");
}

// Finally, if currentVideoIndex is *still* -1 (meaning neither URL nor restore worked)
// and a playlist exists, play the first one.
if (window.currentVideoIndex === -1 && window.player && window.currentPlaylist.length > 0) {
logDebug("No specific video initiated, loading first video in playlist:", window.currentPlaylist[0]);
window.playVideo(window.currentPlaylist[0], 0);
} else if (window.currentVideoIndex !== -1) {
logDebug("Video playback initiated by activeVidParam or restore, skipping default play first video.");
}
// --- END Playlist Initialization Logic ---


// Task 5: Check for and re-sync active playlist item with player video if desynchronized
if (window.player && window.currentPlaylist.length > 0 && window.player.getVideoData()) {
const playerVideoId = window.player.getVideoData().video_id;
const playlistActiveVideoId = window.currentVideoIndex > -1 ? window.currentPlaylist[window.currentVideoIndex] : null;

if (playerVideoId !== playlistActiveVideoId) {
logWarn(`Desynchronization detected: Player playing ${playerVideoId}, but playlist active item is ${playlistActiveVideoId}. Attempting to re-sync.`);
const newIndex = window.currentPlaylist.indexOf(playerVideoId);
if (newIndex !== -1) {
window.currentVideoIndex = newIndex;
window.highlightActivePlaylistItem();
window.saveActivePlaylistItem(); // Save new synced state
logDebug(`Playlist active item re-synced to index ${newIndex} for video ${playerVideoId}.`);
} else {
logWarn(`Video ${playerVideoId} currently playing in player is not found in the current shrimpTube playlist. Cannot re-sync UI.`);
window.currentVideoIndex = -1; // Reset to indicate no matching active item in UI
window.highlightActivePlaylistItem(); // Clear any existing highlight
}
} else {
logDebug("Playlist active item and player video are synchronized.");
}
}


window.initialLoadComplete = true;
logDebug("Initial load complete for playlist-manager.js.");
};

document.addEventListener("DOMContentLoaded", () => {
document.getElementById("export-pl-snapshot-btn").style.display ="none";
document.getElementById("import-pl-snapshot-btn").style.display ="none";
// Initial handling of videos added via input field
if (window.videoIdInput && window.addVideoBtn) {
window.addVideoBtn.addEventListener("click", async () => {
const inputValue = window.videoIdInput.value.trim();
// if (!inputValue) return;
if (!inputValue) {
navigator.clipboard
.readText()
.then((clipText) => ( window.videoIdInput.value = clipText));
return;
}
//xxxxxxxxxxxxxxx
let idsToAdd = [];
if (inputValue.startsWith("PL") && !inputValue.includes(",")) {
logDebug("Detected playlist ID from input:", inputValue);
try {
const videoIds = await window.getInitialVideoIdsPromise(inputValue, window.apiKey);
idsToAdd.push(...videoIds);
} catch (error) {
alert("Error fetching videos from playlist: " + error.message);
logError("Error fetching videos from playlist:", error);
}
} else if (inputValue.includes(",")) {
inputValue.split(",").map(id => id.trim()).forEach(id => idsToAdd.push(id));
logDebug("Detected comma-separated video IDs from input:", idsToAdd);
} else {
idsToAdd.push(inputValue);
logDebug("Detected single video ID from input:", inputValue);
}

if (idsToAdd.length > 0) {
await window.addVideosToPlaylist(idsToAdd);
window.videoIdInput.value = ""; // Clear input after processing

// If playlist was empty before adding, start playing the first video
if (window.currentPlaylist.length > 0 && window.playerReady && (typeof window.player.getPlayerState !== 'function' || (window.player.getPlayerState() !== YT.PlayerState.PLAYING && window.player.getPlayerState() !== YT.PlayerState.PAUSED))) {
window.playVideo(window.currentPlaylist[0], 0);
logDebug("Started playing the first added video as playlist was previously empty or not playing.");
}
}
});
logDebug("Add video button event listener attached.");
} else {
logWarn("Video ID input or Add video button not found.");
}
});