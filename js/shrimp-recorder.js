// ************************************************************
//  shrimpRecorder.init()
//   shrimpRecorder.remove()
//   < script src=" ./js/shrimp-recorder.js" >< /script> 
// ***************************************************************
/*  einsatzbeispiel
     shrimpRecorder.init()
     shrimpRecorder.remove()
    < script src= ./js/shrimp-recorder.js ></ script > 

           document.addEventListener('DOMContentLoaded', () => {
            const loadButton = document.getElementById('loadRecorder');       
            loadButton.addEventListener('click', () => {      
                shrimpRecorder.init();                 
             });            
         });
*/
 

// Globales Objekt, das die Recorder-Funktionalität enthält

window.shrimpRecorder = (function() {
// Private Variablen für den internen Zustand und DOM-Referenzen
let _overlayElement = null; // Das neue Overlay-Element
let _containerElement = null; // Der eigentliche Recorder-Inhalts-Container
let _styleElement = null;
let _videoElement = null;
let _videoWrapper = null;
// let _downloadLink = null; // Entfernt, da Download-Funktion ersetzt wird
let _stopButton = null;
let _closeButton = null; // Neuer Close-Button
let _recordAudioButton = null;
let _recordVideoButton = null;
let _recordScreenButton = null;
let _infoButtons = [];

let _shouldStop = false;
let _stopped = false;
let _mediaRecorder = null;
let _currentStream = null; // Aktueller MediaStream, der aufgezeichnet wird
let _recordingActive = false;
let _recordedChunks = [];

// CSS-Stile als String
const _cssStyles = `
/* Overlay für den gesamten Bildschirm */
.shrimp-recorder-overlay {
position: fixed;
top: 0;
left: 0;
width: 100%;
height:auto;
max-height:800px;
overflow-y: auto;
background-color: rgba(0, 0, 0, 0.7); /* Dunkler, leicht transparenter Hintergrund */
display: flex;
justify-content: center;
align-items: center;
z-index: 10000; /* Sicherstellen, dass es über allem anderen liegt */
box-sizing: border-box;
padding: 5px; /* Etwas Puffer vom Rand */
margin:0;
}

/* Hauptcontainer des Recorders, zentriert im Overlay */
.shrimp-recorder-container {
background-color: #fff;
border-radius: 8px;
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
padding: 10px;
margin:0;

display: flex;
flex-direction: column;
align-items: center;
max-width: 760px; /* Breiterer Container für bessere Darstellung */
width: 100%;
position: relative; /* Für den Close-Button */
}

/* Close Button im Modal */
.shrimp-recorder-close-btn {
position: absolute;
top: 2px;
right: 5px;
background: none;
border: none;
font-size: 1.3rem;
line-height: 1;
cursor: pointer;
color: #555;
transition: color 0.2s ease-in-out;
padding: 3px;
}

.shrimp-recorder-close-btn:hover {
color: #333;
transform: rotate(90deg);
}

.shrimp-recorder-btn {
padding: 0.75rem 1.5rem;
border: none;
border-radius: 0.25rem;
font-size: 1rem;
cursor: pointer;
margin: 0.5rem;
transition: background-color 0.2s ease-in-out;
min-width: 120px; /* Einheitliche Button-Breite */
}

.shrimp-recorder-btn:hover:not(:disabled) {
opacity: 0.9;
}

.shrimp-recorder-btn:disabled {
background-color: #cccccc;
cursor: not-allowed;
}

.shrimp-recorder-btn-primary {
background-color: #007bff;
color: #fff;
}

.shrimp-recorder-btn-danger {
background-color: #dc3545;
color: #fff;
}

.shrimp-recorder-btn-info {
background-color: #17a2b8;
color: #fff;
}

/* .shrimp-recorder-download { display: none; } */ /* Nicht mehr benötigt */

/* Stop-Button anfänglich ausblenden */
#shrimp-recorder-stop {
display: none;
}

.shrimp-recorder-video-wrapper {
padding: 3rem 0 0 0; /* Oben 3rem Padding, Seiten 0 */
display: none; /* Video-Wrapper anfänglich ausblenden */
justify-content: center;
width: 100%;
}

.shrimp-recorder-video-element {
max-width: 100%; /* Responsives Video */
height: auto;
background-color: #000;
border-radius: 4px;
display: block; /* Entfernt zusätzlichen Platz unter dem Video */
}
`;

// Hilfsfunktion zum Erstellen von DOM-Elementen
function _createElement(tag, id, classes, textContent) {
const element = document.createElement(tag);
if (id) element.id = id;
if (classes) element.className = classes;
if (textContent) element.textContent = textContent;
return element;
}

// --- Recorder UI-Statusverwaltung ---
function _startRecordUI() {
_infoButtons.forEach(button => button.disabled = true);
// _downloadLink.style.display = 'none'; // Nicht mehr benötigt
_stopButton.style.display = 'inline-block'; // Stop-Button anzeigen
_videoWrapper.style.display = 'flex'; // Video-Wrapper anzeigen
_recordingActive = true;
}

function _stopRecordUI() {
_infoButtons.forEach(button => button.disabled = false);
_stopButton.style.display = 'none';
_recordingActive = false;
_videoWrapper.style.display = 'none';
}

const _audioRecordConstraints = { echoCancellation: true };

// --- Kern-Aufnahmelogik ---
const _handleRecord = function({ stream: newStream, mimeType }) {
_currentStream = newStream; // Stream dem internen Modul-Stream zuweisen
_startRecordUI();
_recordedChunks = [];
_shouldStop = false; // shouldStop für eine neue Aufnahme zurücksetzen
_stopped = false;
_mediaRecorder = new MediaRecorder(_currentStream, { mimeType }); // mimeType an MediaRecorder übergeben

_mediaRecorder.ondataavailable = function(e) {
if (e.data.size > 0) {
_recordedChunks.push(e.data);
}
// Logik für manuellen Stop-Button-Klick
if (_shouldStop === true && _stopped === false) {
_mediaRecorder.stop();
_stopped = true;
}
};

_mediaRecorder.onstop = function() {
const blob = new Blob(_recordedChunks, { type: mimeType });
_recordedChunks = []; // Chunks nach Blob-Erstellung löschen

const now = new Date();
const timestamp = now.toISOString().replace(/[:.-]/g, '');
const extension = mimeType.includes('video') ? 'mp4' : (mimeType.includes('audio') ? 'webm' : 'bin');
const filename = `recording_${timestamp}.${extension}`;

// Anstatt Download, rufen wir die globale recApp Funktion auf
if (window.recApp && typeof window.recApp === 'function') {
  window.recApp(blob, filename, mimeType);
} else {
  console.error("recApp Funktion ist nicht global verfügbar oder nicht vom Typ Funktion.");
  // Fallback: Wenn recApp nicht verfügbar ist, könnte man trotzdem den Download anbieten
  // oder eine Fehlermeldung anzeigen. Hier wird der Download als Fallback belassen.
  const tempDownloadLink = _createElement('a');
  tempDownloadLink.href = URL.createObjectURL(blob);
  tempDownloadLink.download = filename;
  document.body.appendChild(tempDownloadLink);
  tempDownloadLink.click();
  document.body.removeChild(tempDownloadLink);
  URL.revokeObjectURL(tempDownloadLink.href);
  alert("Aufnahme beendet, aber die AI-Upload-Funktion ist nicht verfügbar. Datei wird heruntergeladen.");
}


// Alle Tracks im Stream stoppen, um Kamera-/Mikrofonlichter auszuschalten
if (_currentStream) {
_currentStream.getTracks().forEach(track => track.stop());
}

_stopRecordUI();
_videoElement.srcObject = null;
_currentStream = null; // Stream-Referenz löschen
};

_mediaRecorder.onerror = function(e) {
console.error('MediaRecorder Fehler:', e.error);
alert(`Aufnahmefehler: ${e.error.name} - ${e.error.message}`);
// Versuch der Bereinigung auch bei einem Fehler
if (_currentStream) {
_currentStream.getTracks().forEach(track => track.stop());
}
_stopRecordUI();
_videoElement.srcObject = null;
_currentStream = null;
_recordedChunks = [];
_shouldStop = false;
_stopped = false;
};

_mediaRecorder.start(200); // Daten alle 200ms sammeln
console.log('Recorder gestartet. Status:', _mediaRecorder.state);
};

// --- Aufnahmetyp-Funktionen ---
async function _recordAudio() {
const mimeType = 'audio/webm'; // WebM für Audio ist weit verbreitet
_shouldStop = false;
try {
const stream = await navigator.mediaDevices.getUserMedia({ audio: _audioRecordConstraints });
_handleRecord({ stream: stream, mimeType });
} catch (error) {
console.error("Fehler beim Zugriff auf Audio:", error);
alert("Fehler beim Zugriff auf Audio. Bitte überprüfen Sie Ihre Mikrofonberechtigungen.");
_stopRecordUI();
}
}

async function _recordVideo() {
const mimeType = 'video/mp4'; // MP4 für Video ist eine gute Standardwahl
_shouldStop = false;
const constraints = {
audio: { "echoCancellation": true },
video: { "width": { "min": 640, "max": 1024 }, "height": { "min": 480, "max": 768 } }
};
try {
const stream = await navigator.mediaDevices.getUserMedia(constraints);
_videoElement.srcObject = stream; // Kamera-Vorschau anzeigen
_handleRecord({ stream: stream, mimeType });
} catch (error) {
console.error("Fehler beim Zugriff auf Video:", error);
alert("Fehler beim Zugriff auf Video. Bitte überprüfen Sie Ihre Kamera- und Mikrofonberechtigungen.");
_stopRecordUI();
}
}

async function _recordScreen() {
const mimeType = 'video/mp4'; // MP4 für Video ist eine gute Standardwahl
_shouldStop = false;
if (!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)) {
return window.alert('Bildschirmaufnahme wird nicht unterstützt!');
}

let tempStream = null;
try {
const displayStream = await navigator.mediaDevices.getDisplayMedia({
video: { cursor: "motion" },
audio: { 'echoCancellation': true } // Audio vom Bildschirm, falls verfügbar
});
_videoElement.srcObject = displayStream; // Bildschirm-Vorschau anzeigen

if (window.confirm("Audio mit Bildschirm aufnehmen?")) {
const audioContext = new AudioContext();
try {
const voiceStream = await navigator.mediaDevices.getUserMedia({ audio: { 'echoCancellation': true }, video: false });
const userAudio = audioContext.createMediaStreamSource(voiceStream);
const audioDestination = audioContext.createMediaStreamDestination();
userAudio.connect(audioDestination);

if (displayStream.getAudioTracks().length > 0) {
const displayAudio = audioContext.createMediaStreamSource(displayStream);
displayAudio.connect(audioDestination);
}

const tracks = [...displayStream.getVideoTracks(), ...audioDestination.stream.getTracks()];
tempStream = new MediaStream(tracks);
_handleRecord({ stream: tempStream, mimeType });

} catch (audioError) {
console.error("Fehler beim Zugriff auf Mikrofon für Bildschirmaufnahme:", audioError);
alert("Fehler beim Zugriff auf das Mikrofon. Die Bildschirmaufnahme wird ohne Mikrofon-Audio fortgesetzt.");
tempStream = displayStream;
_handleRecord({ stream: tempStream, mimeType });
}
} else {
tempStream = displayStream;
_handleRecord({ stream: tempStream, mimeType });
}
} catch (error) {
console.error("Fehler beim Zugriff auf den Bildschirm:", error);
alert("Fehler beim Zugriff auf den Bildschirm. Bitte überprüfen Sie Ihre Bildschirmaufnahmeberechtigungen.");
_stopRecordUI();
}
}

// --- Öffentliche API-Funktion: Initialisieren des Recorders ---
function init(targetElementId = 'body') {
if (_overlayElement) { // Prüfen, ob das Overlay bereits existiert
console.warn("shrimpRecorder ist bereits initialisiert.");
return;
}

// 1. CSS injizieren
_styleElement = _createElement('style', null, null, _cssStyles);
document.head.appendChild(_styleElement);

// 2. HTML-Struktur erstellen
_overlayElement = _createElement('div', null, 'shrimp-recorder-overlay');
_containerElement = _createElement('div', null, 'shrimp-recorder-container');

// Close Button
_closeButton = _createElement('button', null, 'shrimp-recorder-close-btn', 'X');
_closeButton.type = 'button';
_closeButton.setAttribute('aria-label', 'Recorder schließen');
_containerElement.appendChild(_closeButton);

// Download-Span und Link wurden entfernt
// const downloadSpan = _createElement('span');
// _downloadLink = _createElement('a', 'shrimp-recorder-download', 'shrimp-recorder-download');
// const downloadButton = _createElement('button', null, 'shrimp-recorder-btn shrimp-recorder-btn-primary', 'Download');
// downloadButton.type = 'button';
// _downloadLink.appendChild(downloadButton);
// downloadSpan.appendChild(_downloadLink);

_stopButton = _createElement('button', 'shrimp-recorder-stop', 'shrimp-recorder-btn shrimp-recorder-btn-danger', 'Stop');
_stopButton.type = 'button';

// Pause-Button wurde entfernt

_recordAudioButton = _createElement('button', 'shrimp-recorder-recordAudio', 'shrimp-recorder-btn shrimp-recorder-btn-info', 'Record Audio');
_recordAudioButton.type = 'button';

_recordVideoButton = _createElement('button', 'shrimp-recorder-recordVideo', 'shrimp-recorder-btn shrimp-recorder-btn-info', 'Record Video');
_recordVideoButton.type = 'button';

_recordScreenButton = _createElement('button', 'shrimp-recorder-recordScreen', 'shrimp-recorder-btn shrimp-recorder-btn-info', 'Record Screen');
_recordScreenButton.type = 'button';

_videoWrapper = _createElement('div', null, 'shrimp-recorder-video-wrapper');
_videoElement = _createElement('video', null, 'shrimp-recorder-video-element');
_videoElement.autoplay = true;
_videoElement.height = '480';
_videoElement.width = '640';
_videoElement.muted = true; // Lokale Vorschau stumm schalten
_videoElement.playsInline = true; // Für iOS Kompatibilität
_videoWrapper.appendChild(_videoElement);

// Alle Elemente zum Container hinzufügen
// _containerElement.appendChild(downloadSpan); // Download-Span wurde entfernt
_containerElement.appendChild(_stopButton);
_containerElement.appendChild(_recordAudioButton);
_containerElement.appendChild(_recordVideoButton);
_containerElement.appendChild(_recordScreenButton);
_containerElement.appendChild(_videoWrapper);

// Container zum Overlay hinzufügen und Overlay zum Ziel-Element
_overlayElement.appendChild(_containerElement);
let target = document.getElementById(targetElementId);
if (!target && targetElementId === 'body') {
target = document.body;
} else if (!target) {
console.error(`Ziel-Element mit ID "${targetElementId}" nicht gefunden. Füge zu Body hinzu.`);
target = document.body;
}
target.appendChild(_overlayElement);

// Referenzen für Info-Buttons erhalten (muss nach dem Hinzufügen zum DOM erfolgen)
_infoButtons = _containerElement.querySelectorAll('.shrimp-recorder-btn-info');

// 3. Event-Listener anfügen
_closeButton.addEventListener('click', remove); // Close-Button löst remove aus
_stopButton.addEventListener('click', () => { _shouldStop = true; });
_recordAudioButton.addEventListener('click', _recordAudio);
_recordVideoButton.addEventListener('click', _recordVideo);
_recordScreenButton.addEventListener('click', _recordScreen);

console.log("shrimpRecorder erfolgreich initialisiert.");
}

// --- Öffentliche API-Funktion: Entfernen des Recorders ---
function remove() {
if (!_overlayElement) { // Prüfen, ob das Overlay existiert
console.warn("shrimpRecorder ist nicht initialisiert oder bereits entfernt.");
return;
}

// 1. Aktive Aufnahme und Streams stoppen
if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
_mediaRecorder.stop();
}
if (_currentStream) {
_currentStream.getTracks().forEach(track => track.stop());
}
if (_videoElement) _videoElement.srcObject = null; // Video-Vorschau löschen

// 2. Event-Listener entfernen (explizit für Sauberkeit)
if (_closeButton) _closeButton.removeEventListener('click', remove);
if (_stopButton) _stopButton.removeEventListener('click', () => { _shouldStop = true; });
if (_recordAudioButton) _recordAudioButton.removeEventListener('click', _recordAudio);
if (_recordVideoButton) _recordVideoButton.removeEventListener('click', _recordVideo);
if (_recordScreenButton) _recordScreenButton.removeEventListener('click', _recordScreen);

// 3. HTML-Elemente entfernen
_overlayElement.remove();
_overlayElement = null; // Referenz löschen
_containerElement = null;

// 4. CSS-Stile entfernen
_styleElement.remove();
_styleElement = null; // Referenz löschen

// 5. Object URLs widerrufen (falls noch vorhanden, z.B. bei Fallback-Download)
// if (_downloadLink && _downloadLink.href && _downloadLink.href.startsWith('blob:')) {
// URL.revokeObjectURL(_downloadLink.href);
// }

// 6. Alle internen Zustände zurücksetzen
_videoElement = null;
_videoWrapper = null;
// _downloadLink = null; // Entfernt
_stopButton = null;
_closeButton = null;
_recordAudioButton = null;
_recordVideoButton = null;
_recordScreenButton = null;
_infoButtons = [];
_shouldStop = false;
_stopped = false;
_mediaRecorder = null;
_currentStream = null;
_recordingActive = false;
_recordedChunks = [];

console.log("shrimpRecorder erfolgreich entfernt.");
}

// Gib die öffentliche API zurück
return {
init: init,
remove: remove
};

})(); // Ende der selbstausführenden Funktion