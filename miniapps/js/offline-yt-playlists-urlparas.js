document.addEventListener('DOMContentLoaded', () => {
const fileInput = document.getElementById('fileInput');
const loadFileBtn = document.getElementById('loadFileBtn');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const clearStorageBtn = document.getElementById('clearStorageBtn');
const playlistTableContainer = document.getElementById('playlistTableContainer');
const noDataMessage = document.getElementById('noDataMessage');

// Elemente für den neuen "Ausgewählte Videos" Bereich
const selectedVideosManager = document.getElementById('selectedVideosManager');
const selectedVideosControls = document.getElementById('selectedVideosControls');
const selectedVideosList = document.getElementById('selectedVideosList');
const noSelectedVideosMessage = document.getElementById('noSelectedVideosMessage');
const copySelectedIdsBtn = document.getElementById('copySelectedIdsBtn');
const clearSelectedIdsBtn = document.getElementById('clearSelectedIdsBtn');

// NEW: Elements for URL Parameter Manager
const urlParamsTableContainer = document.getElementById('urlParamsTableContainer');
const addUrlParamBtn = document.getElementById('addUrlParamBtn');
const openNewPageBtn = document.getElementById('openNewPageBtn');
const loaderApiKeyDisplay = document.getElementById('loaderApiKeyDisplay');

const LOCAL_STORAGE_KEY = 'playlistsDataMG';
const SELECTED_VIDEO_IDS_KEY = 'selectedVideoIds'; // Neuer Schlüssel für ausgewählte Videos
const URL_PARAMS_STORAGE_KEY = 'urlParametersMG'; // Schlüssel für URL Parameter
const CSV_DELIMITER = ';';

// Array für ausgewählte Video-IDs
let selectedVideoIds = [];
// Map, um Referenzen zu "Zu Auswahl hinzufügen"-Buttons zu speichern (videoId -> buttonElement)
const videoSelectionButtons = new Map();

// Array für URL-Parameter
let urlParameters = [];

// --- Start: Constants and Helper functions for YouTube API integration ---

// WICHTIG: Dieser API-Schlüssel stammt von Dritten.
// ERSETZEN SIE DIESEN PLATZHALTER DURCH EINEN ECHTEN API-KEY FÜR loader.to!
const LOADER_TO_API_KEY = "dfcb6d76f2f6a9894gjkege8a4ab232222"; // Beispiel: "dfcb6d76f2f6a9894gjkege8a4ab232222";
loaderApiKeyDisplay.textContent = LOADER_TO_API_KEY; // Display the fixed Loader.to API Key

const DEFAULT_FORMAT = "720"; // Format, falls für Download relevant (hier nur Platzhalter)
const API_LIMIT = 200; // Maximale Anzahl der abzurufenden Playlist-Items von der API
const DISPLAY_LIMIT = 10; // Standardmäßige Anzahl der anzuzeigenden Videos (wie gewünscht)

// Hilfsfunktion, um Playlist ID aus URL zu extrahieren (falls mal eine URL eingegeben wird)
function getPlaylistIdFromUrl(url) {
try {
const urlObj = new URL(url);
return urlObj.searchParams.get('list');
} catch (e) {
return null;
}
}

// NEW: Hilfsfunktion, um YouTube Video ID aus URL zu extrahieren
function extractYoutubeVideoId(url) {
const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
const match = url.match(regex);
return match ? match[1] : '';
}

// Funktion zum Formatieren der Videodauer (HH:MM:SS)
function formatDuration(totalSeconds) {
if (totalSeconds === undefined || totalSeconds === null) return 'N/A';
if (totalSeconds === 0) return '0:00';

const hours = Math.floor(totalSeconds / 3600);
const minutes = Math.floor((totalSeconds % 3600) / 60);
const seconds = totalSeconds % 60;

const parts = [];
if (hours > 0) parts.push(String(hours).padStart(2, '0'));
parts.push(String(minutes).padStart(2, '0'));
parts.push(String(seconds).padStart(2, '0'));
return parts.join(':');
}

// Funktion zum Aktualisieren des Zustands eines einzelnen "Zu Auswahl hinzufügen"-Buttons
function updateSingleVideoSelectionButton(videoId) {
const button = videoSelectionButtons.get(videoId);
if (button) {
const isSelected = selectedVideoIds.includes(videoId);
button.classList.toggle('selected', isSelected);
// Update text based on selection state for pl-manager-btn-2
button.textContent = isSelected ? 'ausgewählt (✓)' : 'nicht ausgewählt';
}
}

// Funktion zum Rendern einzelner Video-Items
function renderVideoItem(video) {
const item = document.createElement("div");
item.className = "video-item";

// ROBUSTE VIDEO_ID EXTRAKTION
let videoId = video?.id || video?.info?.id || ''; // Prüfe top-level 'id', dann 'info.id'
if (!videoId && video?.url) { // Wenn immer noch keine ID, versuche sie aus der URL zu extrahieren
videoId = extractYoutubeVideoId(video.url);
}
item.dataset.videoId = videoId; // Video ID am Element speichern

const duration = formatDuration(video?.info?.duration);
const videoUrl = video?.url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '#'); // Fallback-URL

// Bestimme den Anfangszustand des "Zu Auswahl hinzufügen"-Buttons
const isSelected = selectedVideoIds.includes(videoId);
// Anpassung der Button-Texte
const addRemoveBtnText = isSelected ? 'ausgewählt (✓)' : 'nicht ausgewählt';
const addRemoveBtnClass = isSelected ? 'selected' : '';

item.innerHTML = `
<img class="video-item-thumbnail" src="${video?.info?.thumbnail_url || 'https://via.placeholder.com/320x180?text=No+Thumbnail'}" alt="${video?.info?.title || 'Video Thumbnail'}">
<div class="video-item-content">
<button class="video-title-button">${video?.info?.title || "n/a"}</button>
<div class="video-item-meta">
<span class="uploader">Kanal: ${video?.info?.author_name || 'Unbekannt'}</span>
<span class="duration">Dauer: ${duration}</span>
</div>

<div class="video-item-actions">
${videoId ? `<button class="video-item-link pl-manager-btn-1" data-video-id="${videoId}"> copy clip-id </button>` : ''}
${videoId ? `<button data-video-id="${videoId}" class="video-item-link pl-manager-btn-2 ${addRemoveBtnClass}"> ${addRemoveBtnText} </button>` : ''}
<button data-video-url="${videoUrl}" data-video-id="${videoId}" class="video-item-link pl-manager-btn-3"> watch clip on youtube </button>
<button class="video-item-link pl-manager-btn-4"> Video ausblenden </button>
</div>
</div>
`;

// Event Listener für den Video-Titel Button
item.querySelector('.video-title-button').addEventListener('click', () => {
// Toast.info(video?.info?.title || "Kein Titel"); // Kann aktiviert werden, wenn gewünscht
});

// Nur Buttons hinzufügen und Listener registrieren, wenn eine gültige videoId vorhanden ist
if (videoId) {
// Event Listener für "copy clip-id" (pl-manager-btn-1)
const copyBtn = item.querySelector('.pl-manager-btn-1');
if (copyBtn) {
copyBtn.addEventListener('click', () => {
navigator.clipboard.writeText(videoId)
.then(() => Toast.info(`Video ID "${videoId}" ins Clipboard kopiert!`, 2000))
.catch(err => {
console.error('Fehler beim Kopieren der Video ID:', err);
Toast.error('Fehler beim Kopieren der Video ID ins Clipboard: ' + err.message);
});
});
}

// Event Listener für "nicht ausgewählt / ausgewählt (✓)" (pl-manager-btn-2)
const addRemoveBtn = item.querySelector('.pl-manager-btn-2');
if (addRemoveBtn) {
videoSelectionButtons.set(videoId, addRemoveBtn); // Referenz speichern
addRemoveBtn.addEventListener('click', () => {
if (selectedVideoIds.includes(videoId)) {
selectedVideoIds = selectedVideoIds.filter(id => id !== videoId);
Toast.info(`Video ID "${videoId}" aus Auswahl entfernt.`, 2000);
} else {
selectedVideoIds.push(videoId);
Toast.success(`Video ID "${videoId}" zur Auswahl hinzugefügt.`, 2000);
}
saveSelectedVideoIds(); // Speichern und alle relevanten Buttons aktualisieren
});
}
} else {
console.warn('Video-Element ohne gültige Video ID gerendert. Einige Buttons könnten fehlen oder nicht funktionsfähig sein:', video);
}

// Event Listener für "watch clip on youtube" (pl-manager-btn-3)
const showVidBtn = item.querySelector('.pl-manager-btn-3');
if (showVidBtn) {
showVidBtn.addEventListener('click', (event) => {
const url = event.target.dataset.videoUrl;
if (url && url !== '#') { // Sicherstellen, dass die URL nicht der Fallback-Hash ist
window.open(url, '_blank');
} else {
Toast.warning('Keine gültige Video URL verfügbar.', 2000);
}
});
}

// Event Listener für "Video ausblenden" (pl-manager-btn-4)
item.querySelector('.pl-manager-btn-4').addEventListener('click', () => {
// Falls dieses Video ausgewählt war, auch aus der Auswahl entfernen
if (videoId && selectedVideoIds.includes(videoId)) {
selectedVideoIds = selectedVideoIds.filter(id => id !== videoId);
saveSelectedVideoIds(); // Lokalen Speicher und UI aktualisieren
Toast.info(`Video "${video?.info?.title || videoId}" ausgeblendet und aus Auswahl entfernt.`, 2000);
} else {
Toast.info(`Video "${video?.info?.title || videoId}" ausgeblendet.`, 2000);
}
item.remove(); // Entfernt das Video-Element aus der Anzeige
videoSelectionButtons.delete(videoId); // Referenz entfernen
});

return item;
}

// Funktion zum Rendern der Video-Kacheln in einem Container
function renderVideoTiles(videos, containerElement) {
containerElement.innerHTML = ''; // Vorherigen Inhalt löschen
videoSelectionButtons.clear(); // WICHTIG: Map leeren, bevor neue Kacheln gerendert werden

const videoListDiv = document.createElement('div');
videoListDiv.className = 'playlist-video-list';
containerElement.appendChild(videoListDiv);

const displayCount = { current: DISPLAY_LIMIT }; // Aktuelles Anzeigelimit verfolgen

function updateDisplay() {
videoListDiv.innerHTML = ''; // Bestehende Kacheln löschen
const videosToDisplay = videos.slice(0, displayCount.current);
videosToDisplay.forEach(video => {
videoListDiv.appendChild(renderVideoItem(video));
});

// "Mehr/Weniger anzeigen" Button hinzufügen
if (videos.length > DISPLAY_LIMIT) {
let showMoreButton = containerElement.querySelector('.show-more-button');
if (!showMoreButton) {
showMoreButton = document.createElement('button');
showMoreButton.className = 'show-more-button';
containerElement.appendChild(showMoreButton);
}

if (displayCount.current < videos.length) {
showMoreButton.textContent = `Zeige mehr (${videos.length - displayCount.current} weitere Videos)`;
showMoreButton.onclick = () => {
displayCount.current = videos.length;
updateDisplay();
};
} else {
showMoreButton.textContent = `Zeige weniger (${videos.length - DISPLAY_LIMIT} Videos verbergen)`;
showMoreButton.onclick = () => {
displayCount.current = DISPLAY_LIMIT;
updateDisplay();
};
}
} else {
const showMoreButton = containerElement.querySelector('.show-more-button');
if (showMoreButton) showMoreButton.remove();
}
}
updateDisplay();
}

// Hauptfunktion zum Laden der Playlist-Details von der API und Anzeigen
async function fetchAndDisplayPlaylistDetails(playlistData, rowElement) {
const playlistId = playlistData.yt_playlist_id;
const videoIds = playlistData.yt_video_ids.split(',').map(id => id.trim()).filter(id => id !== '');

// Erstelle die Detail-Zeile und den Container
const detailRow = document.createElement('tr');
detailRow.className = 'playlist-details-row';
detailRow.dataset.openedPlaylistId = playlistId || 'video-ids-' + (videoIds[0] || Date.now()); // Identifiziert den geöffneten Bereich

const detailCell = document.createElement('td');
detailCell.setAttribute('colspan', '2'); // Spans all columns of the table
detailRow.appendChild(detailCell);

rowElement.after(detailRow); // Direkt nach der geklickten Zeile einfügen

const messageDiv = document.createElement('p');
messageDiv.className = 'details-message loading';
messageDiv.textContent = 'Lade Videos...';
detailCell.appendChild(messageDiv);

// Fetch from loader.to if a playlist ID is available
if (playlistId) {
try {
const youtubePlaylistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
const response = await fetch(
"https://loader.to/api/ajax/playlistJSON?format=" + DEFAULT_FORMAT + "&api=" + LOADER_TO_API_KEY + "&limit=" + API_LIMIT + "&url=" + encodeURIComponent(youtubePlaylistUrl), {
cache: "no-store"
}
);

if (!response.ok) {
const errorText = await response.text();
throw new Error(`HTTP Fehler! Status: ${response.status} - ${errorText}`);
}

const data = await response.json();

if (!Array.isArray(data) || data.length === 0) {
messageDiv.textContent = 'Keine Videos in dieser Playlist gefunden oder ungültige Antwort.';
messageDiv.className = 'details-message error';
Toast.error('Keine Videos in dieser Playlist gefunden oder ungültige Antwort.');
return;
}

messageDiv.textContent = `Erfolgreich ${data.length} Videos geladen.`;
messageDiv.className = 'details-message'; // Reset to info style
renderVideoTiles(data, detailCell); // Render the tiles

} catch (error) {
console.error("Fehler beim Laden der Playlist:", error);
let displayError = error.message;
messageDiv.textContent = `Fehler beim Laden der Playlist: ${displayError}`;
messageDiv.className = 'details-message error';
Toast.error(`Fehler beim Laden der Playlist: ${displayError}`);
}
} else if (videoIds.length > 0) {
// Wenn nur Video-IDs vorhanden sind, diese direkt rendern (nicht über loader.to Playlist API)
messageDiv.textContent = `Direkte Video-IDs gefunden. (${videoIds.length} Clips)`;
messageDiv.className = 'details-message';

// Erstelle minimale Video-Objekte für renderVideoTiles
const minimalVideos = videoIds.map(vid => ({
id: vid,
url: `https://www.youtube.com/watch?v=${vid}`,
info: {
title: `Video ID: ${vid}`,
thumbnail_url: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
author_name: 'Unbekannt', // Placeholder, as no API call for this
duration: null // Placeholder, as no API call for this
}
}));
renderVideoTiles(minimalVideos, detailCell); // Verwende renderVideoTiles für Konsistenz

} else {
messageDiv.textContent = 'Keine gültige Playlist ID oder Video IDs für diesen Eintrag verfügbar.';
messageDiv.className = 'details-message error';
Toast.warning('Keine gültige Playlist ID oder Video IDs für diesen Eintrag verfügbar.', 3000);
}
}
// --- End: YouTube API integration functions ---

// Funktion zum Parsen einer CSV-Zeile
function parseCSVLine(line, delimiter) {
const result = [];
let inQuote = false;
let currentField = '';
for (let i = 0; i < line.length; i++) {
const char = line[i];
if (char === '"') {
if (inQuote && i + 1 < line.length && line[i + 1] === '"') {
currentField += '"';
i++;
} else {
inQuote = !inQuote;
}
} else if (char === delimiter && !inQuote) {
result.push(currentField);
currentField = '';
} else {
currentField += char;
}
}
result.push(currentField);
return result;
}

// Funktion zum Parsen von CSV-Text
function parseCSV(csvText) {
const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
if (lines.length === 0) return [];

const headerLine = lines[0];
const rawHeaders = parseCSVLine(headerLine, CSV_DELIMITER);

const headerMap = {
'Playlist-Name': 'playlist_name',
'Playlist-ID': 'yt_playlist_id',
'Video-Ids': 'yt_video_ids',
'Comment': 'comment'
};
const headers = rawHeaders.map(h => headerMap[h.trim()] || h.trim().toLowerCase().replace(/\s/g, '_'));

const data = [];
for (let i = 1; i < lines.length; i++) {
const values = parseCSVLine(lines[i], CSV_DELIMITER);
const item = {};
headers.forEach((header, index) => {
item[header] = values[index] !== undefined ? values[index].trim() : '';
});

const ytPlaylistId = item['yt_playlist_id'];
const ytVideoIds = item['yt_video_ids'];

if (ytPlaylistId || ytVideoIds) {
data.push(item);
} else {
console.warn(`Ungültige Zeile übersprungen (keine Playlist ID oder Video IDs): ${lines[i]}`);
}
}
return data;
}

let currentOpenDetailsRow = null;
let currentActivePlaylistRow = null;

// Funktion zur Anzeige der Playlists
function displayPlaylists(playlists) {
playlistTableContainer.innerHTML = '';

if (!playlists || playlists.length === 0) {
noDataMessage.style.display = 'block';
return;
}

noDataMessage.style.display = 'none';

const table = document.createElement('table');
table.classList.add('playlist-table');
table.innerHTML = `
<thead>
<tr>
<th>Playlist Name</th>
<th>ID / Video-IDs</th>
</tr>
</thead>
<tbody></tbody>
`;
const tbody = table.querySelector('tbody');

playlists.forEach(playlist => {
const playlistName = playlist.playlist_name || 'Unbekannter Name';
const ytPlaylistId = playlist.yt_playlist_id;
const ytVideoIdsStr = playlist.yt_video_ids;
const ytVideoIds = ytVideoIdsStr.split(',').map(id => id.trim()).filter(id => id !== '');

let displayIdText = '';
let uniqueIdentifier = '';

if (ytPlaylistId) {
uniqueIdentifier = ytPlaylistId;
displayIdText = ytPlaylistId.length > 6 ? `${ytPlaylistId.substring(0, 3)}...${ytPlaylistId.substring(ytPlaylistId.length - 8)} (PL)` : `${ytPlaylistId} (PL)`;
} else if (ytVideoIds.length > 0) {
uniqueIdentifier = ytVideoIds[0]; // Use first video ID as identifier
const firstVideoId = ytVideoIds[0];
displayIdText = ytVideoIds.length > 1 ? `VID: ${firstVideoId.substring(0, 3)}...${firstVideoId.substring(firstVideoId.length - 8)} (${ytVideoIds.length} Clips)` : `VID: ${firstVideoId.substring(0, 3)}...${firstVideoId.substring(firstVideoId.length - 8)}`;
} else {
displayIdText = 'Keine ID verfügbar';
uniqueIdentifier = '';
}

const row = document.createElement('tr');
row.dataset.uniqueIdentifier = uniqueIdentifier; // Store identifier for interaction
row.dataset.playlistData = JSON.stringify(playlist); // Store full playlist data
row.innerHTML = `
<td>${playlistName}</td>
<td>${displayIdText}</td>
`;
tbody.appendChild(row);

// Event-Listener für das Klicken auf eine Playlist-Zeile
row.addEventListener('click', () => {
// Playlist ID ins Clipboard kopieren
const clickedPlaylistData = JSON.parse(row.dataset.playlistData);
const playlistIdToCopy = clickedPlaylistData.yt_playlist_id || clickedPlaylistData.yt_video_ids; // Priorisiere Playlist ID, Fallback auf Video IDs

if (playlistIdToCopy) {
navigator.clipboard.writeText(playlistIdToCopy)
.then(() => {
Toast.info(`ID(s) "${playlistIdToCopy}" ins Clipboard kopiert!`, 2000);
})
.catch(err => {
console.error('Fehler beim Kopieren der ID(s):', err);
Toast.error('Fehler beim Kopieren der ID(s) ins Clipboard: ' + err.message);
});
} else {
Toast.warning('Keine Playlist ID oder Video IDs zum Kopieren verfügbar.');
}

// Bestehende Details schließen, falls offen
if (currentOpenDetailsRow) {
currentOpenDetailsRow.remove();
currentOpenDetailsRow = null;
}
if (currentActivePlaylistRow) {
currentActivePlaylistRow.classList.remove('active-playlist-row');
}

// Wenn die geklickte Zeile bereits aktiv war, schließe Details und deaktiviere
// Dies ermöglicht ein Toggle-Verhalten
if (currentActivePlaylistRow === row) {
currentActivePlaylistRow = null;
return; // Keine neuen Details öffnen
}

// Markiere die aktuelle Zeile als aktiv und öffne Details
row.classList.add('active-playlist-row');
currentActivePlaylistRow = row;

// Details für die geklickte Playlist laden und anzeigen
fetchAndDisplayPlaylistDetails(clickedPlaylistData, row);
currentOpenDetailsRow = row.nextElementSibling; // Die neu eingefügte Zeile
});
});

playlistTableContainer.appendChild(table);
}

// Funktion zum Speichern von Daten im Local Storage
function savePlaylists(data) {
localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
displayPlaylists(data);
}

// Funktion zum Laden von Daten aus dem Local Storage
function loadPlaylistsFromStorage() {
const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
return storedData ? JSON.parse(storedData) : [];
}

// --- Funktionen für die Verwaltung ausgewählter Video-IDs ---

// Ausgewählte Video-IDs aus dem Local Storage laden
function loadSelectedVideoIds() {
const storedIds = localStorage.getItem(SELECTED_VIDEO_IDS_KEY);
selectedVideoIds = storedIds ? JSON.parse(storedIds) : [];
}

// Ausgewählte Video-IDs im Local Storage speichern und Liste neu rendern
function saveSelectedVideoIds() {
localStorage.setItem(SELECTED_VIDEO_IDS_KEY, JSON.stringify(selectedVideoIds));
renderSelectedVideosList();
// Alle sichtbaren "Zu Auswahl hinzufügen"-Buttons aktualisieren
videoSelectionButtons.forEach((btn, id) => {
updateSingleVideoSelectionButton(id);
});
}

// Liste der ausgewählten Videos rendern
function renderSelectedVideosList() {
selectedVideosList.innerHTML = ''; // Vorherige Liste löschen

if (selectedVideoIds.length === 0) {
noSelectedVideosMessage.style.display = 'block';
selectedVideosControls.style.display = 'none';
} else {
noSelectedVideosMessage.style.display = 'none';
selectedVideosControls.style.display = 'flex'; // Buttons anzeigen
selectedVideoIds.forEach(id => {
const li = document.createElement('li');
li.innerHTML = `
<span>${id}</span>
<button class="remove-selected-video-btn" data-video-id="${id}"> Entfernen </button>
`;
selectedVideosList.appendChild(li);
});

// Event Listener für "Entfernen"-Buttons in der Liste
selectedVideosList.querySelectorAll('.remove-selected-video-btn').forEach(button => {
button.addEventListener('click', (event) => {
const idToRemove = event.target.dataset.videoId;
selectedVideoIds = selectedVideoIds.filter(id => id !== idToRemove);
saveSelectedVideoIds(); // Speichern und Liste neu rendern
Toast.info(`Video ID "${idToRemove}" aus der Auswahl entfernt.`, 2000);
});
});
}
}

// --- NEW: Functions for URL Parameter Management ---

function saveUrlParams() {
localStorage.setItem(URL_PARAMS_STORAGE_KEY, JSON.stringify(urlParameters));
renderUrlParams();
}

function loadUrlParams() {
const storedParams = localStorage.getItem(URL_PARAMS_STORAGE_KEY);
if (storedParams) {
urlParameters = JSON.parse(storedParams);
} else {
urlParameters = [];
}

// Ensure the apiKey parameter is always present and its name is 'apiKey'
// This is a general 'apiKey' parameter for new page URLs, distinct from LOADER_TO_API_KEY
let apiKeyFound = false;
urlParameters = urlParameters.map(param => {
if (param.name === 'apiKey') {
apiKeyFound = true;
return { ...param, name: 'apiKey' }; // Ensure the name is correct
}
return param;
});
if (!apiKeyFound) {
urlParameters.push({ name: 'apiKey', value: '', active: true });
}
}

function renderUrlParams() {
urlParamsTableContainer.innerHTML = '';

const table = document.createElement('table');
table.classList.add('url-params-table');
table.innerHTML = `
<thead>
<tr>
<th>Aktiv</th>
<th>URL Param Name</th>
<th>Wert</th>
<th>Aktionen</th>
</tr>
</thead>
<tbody></tbody>
`;
const tbody = table.querySelector('tbody');

urlParameters.forEach((param, index) => {
const row = document.createElement('tr');
row.innerHTML = `
<td>
<button type="button" class="toggle-button ${param.active ? 'active' : ''}" data-index="${index}"></button>
</td>
<td>
<input type="text" class="param-name-input" value="${param.name}" data-index="${index}" ${param.name === 'apiKey' ? 'readonly' : ''}>
</td>
<td>
<input type="text" class="param-value-input" value="${param.value}" data-index="${index}">
</td>
<td>
<div class="param-controls">
${param.name !== 'apiKey' ? `<button type="button" class="remove-param-btn" data-index="${index}">Entfernen</button>` : ''}
</div>
</td>
`;
tbody.appendChild(row);
});

urlParamsTableContainer.appendChild(table);

// Add event listeners for new elements
urlParamsTableContainer.querySelectorAll('.toggle-button').forEach(button => {
button.addEventListener('click', (event) => {
const index = parseInt(event.target.dataset.index);
urlParameters[index].active = !urlParameters[index].active;
saveUrlParams();
});
});

urlParamsTableContainer.querySelectorAll('.param-name-input').forEach(input => {
input.addEventListener('change', (event) => {
const index = parseInt(event.target.dataset.index);
// Prevent changing 'apiKey' name
if (urlParameters[index].name === 'apiKey' && event.target.value.trim() !== 'apiKey') {
event.target.value = 'apiKey'; // Revert change
Toast.warning("Der Parameter 'apiKey' kann nicht umbenannt werden.");
return;
}
urlParameters[index].name = event.target.value.trim();
saveUrlParams();
});
});

urlParamsTableContainer.querySelectorAll('.param-value-input').forEach(input => {
input.addEventListener('change', (event) => {
const index = parseInt(event.target.dataset.index);
urlParameters[index].value = event.target.value.trim();
saveUrlParams();
});
});

urlParamsTableContainer.querySelectorAll('.remove-param-btn').forEach(button => {
button.addEventListener('click', (event) => {
const index = parseInt(event.target.dataset.index);
// Prevent removing 'apiKey'
if (urlParameters[index].name === 'apiKey') {
Toast.warning("Der 'apiKey' Parameter kann nicht entfernt werden.");
return;
}
urlParameters.splice(index, 1);
saveUrlParams();
});
});
}

function addUrlParameter() {
urlParameters.push({ name: '', value: '', active: true });
saveUrlParams();
Toast.info('Neuer URL-Parameter hinzugefügt. Bitte Name und Wert eingeben.', 2500);
}

function openNewPageWithParams() {
let baseUrl = 'index.html'; // Or the base path of your application, assuming it's index.html
const activeParams = urlParameters.filter(p => p.active && p.name && p.value);

if (activeParams.length > 0) {
const queryString = activeParams.map(p => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`).join('&');
baseUrl += `?${queryString}`;
Toast.info('Neue Seite mit URL-Parametern geöffnet.', 2000);
} else {
Toast.warning('Keine aktiven URL-Parameter zum Öffnen einer neuen Seite.', 2500);
}
window.open(baseUrl, '_blank');
}

// --- Event Listener für Buttons ---

// Handler für das Laden einer lokalen Datei
loadFileBtn.addEventListener('click', () => {
if (fileInput.files.length === 0) {
Toast.warning('Bitte wählen Sie zuerst eine CSV-Datei aus.');
return;
}
const file = fileInput.files[0];
const reader = new FileReader();

reader.onload = (e) => {
try {
const csvText = e.target.result;
const playlists = parseCSV(csvText);
savePlaylists(playlists);
Toast.success(`${playlists.length} Playlists aus der Datei geladen und gespeichert.`, 3000);
} catch (error) {
Toast.error('Fehler beim Parsen der CSV-Datei. Stellen Sie sicher, dass sie semikolon-separiert ist und korrekte Header hat: ' + error.message);
console.error(error);
}
};

reader.onerror = () => {
Toast.error('Fehler beim Lesen der Datei.');
};

reader.readAsText(file);
});

// Handler für das Laden von einer URL
loadUrlBtn.addEventListener('click', async () => {
const url = urlInput.value.trim();
if (!url) {
Toast.warning('Bitte geben Sie eine gültige URL ein.');
return;
}

try {
const response = await fetch(url);
if (!response.ok) {
throw new Error(`HTTP-Fehler! Status: ${response.status}`);
}
const csvText = await response.text();
const playlists = parseCSV(csvText);
savePlaylists(playlists);
Toast.success(`${playlists.length} Playlists von URL geladen und gespeichert.`, 3000);
} catch (error) {
Toast.error('Fehler beim Laden oder Parsen der CSV von URL. Stellen Sie sicher, dass sie semikolon-separiert ist, korrekte Header hat und die URL erreichbar ist: ' + error.message);
console.error(error);
}
});

// Handler zum Leeren des lokalen Speichers
clearStorageBtn.addEventListener('click', () => {
if (confirm('Möchten Sie wirklich alle gespeicherten Playlists löschen?')) {
localStorage.removeItem(LOCAL_STORAGE_KEY);
displayPlaylists([]);
Toast.info('Lokaler Speicher wurde geleert.', 2500);
}
});

// Handler für "Ausgewählte IDs kopieren"
copySelectedIdsBtn.addEventListener('click', () => {
if (selectedVideoIds.length > 0) {
const idsString = selectedVideoIds.join(',');
navigator.clipboard.writeText(idsString)
.then(() => {
Toast.success('Ausgewählte Video-IDs ins Clipboard kopiert!', 2500);
})
.catch(err => {
console.error('Fehler beim Kopieren der IDs:', err);
Toast.error('Fehler beim Kopieren ins Clipboard: ' + err.message);
});
} else {
Toast.warning('Keine Video-IDs zum Kopieren ausgewählt.', 2000);
}
});

// Handler für "Ausgewählte IDs löschen"
clearSelectedIdsBtn.addEventListener('click', () => {
if (confirm('Möchten Sie wirklich alle ausgewählten Video-IDs löschen?')) {
selectedVideoIds = [];
saveSelectedVideoIds();
Toast.info('Ausgewählte Video-IDs gelöscht.', 2500);
}
});

// NEW: URL Parameter Manager Event Listeners
addUrlParamBtn.addEventListener('click', addUrlParameter);
openNewPageBtn.addEventListener('click', openNewPageWithParams);

// Initiales Laden der Playlists und ausgewählten Videos beim Start der App
const initialPlaylists = loadPlaylistsFromStorage();
displayPlaylists(initialPlaylists);
loadSelectedVideoIds(); // Ausgewählte IDs laden
renderSelectedVideosList(); // Ausgewählte IDs anzeigen

// NEW: Initiales Laden der URL Parameter
loadUrlParams();
renderUrlParams();
});