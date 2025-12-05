/**
* @module appmodUUID - Ein eigenständiger, dynamischer UUID-Generator.
*
* Dieses Modul erstellt und verwaltet eine UI zur Generierung alphanumerischer UUIDs
* (ID-Tokens) und kann zur Laufzeit in jede Webanwendung eingefügt und wieder entfernt werden.
* Es kommt ohne externe Abhängigkeiten aus.
*
* @param {object} settings - Konfigurationseinstellungen für das Modul.
* @param {HTMLElement} settings.targetElement - Das DOM-Element, in das die UI gerendert werden soll. (Erforderlich)
* @param {number} [settings.uuidLength=5] - Die Länge der zu generierenden UUID. (Optional, Standard: 5)
* @param {function(string)} [settings.onGenerateCallback] - Eine optionale Callback-Funktion, die aufgerufen wird,
* wenn eine neue UUID generiert wurde. Die neue UUID
* wird als Argument übergeben.
*
* @example
* // 1. Ein Container-Element in Ihrem HTML (z.B. im Body)
* // <div id="uuid-app-container"></div>
*
* // 2. Modul importieren (als ES Module)
* // <script type="module" src="path/to/appmodUUID.js"></script>
*
* // 3. Modul in Ihrer übergeordneten Webanwendung verwenden
* document.addEventListener('DOMContentLoaded', () => {
* const myContainer = document.getElementById('uuid-app-container');
* if (myContainer) {
* appmodUUID.settings = {
* targetElement: myContainer,
* uuidLength: 10, // Optional: Setze die UUID-Länge auf 10
* onGenerateCallback: (newUUID) => {
* console.log('Neue UUID generiert:', newUUID);
* // Hier können Sie die generierte UUID weiterverarbeiten
* }
* };
*
* // UI initialisieren und anzeigen
* appmodUUID.init();
*
* // Optional: Nach 3 Sekunden eine neue UUID programmatisch generieren
* // setTimeout(() => {
* // appmodUUID.generate();
* // }, 3000);
*
* // Optional: UI nach 10 Sekunden entfernen
* // setTimeout(() => {
* // appmodUUID.destroy();
* // console.log('UUID-Generator entfernt.');
* // }, 10000);
* } else {
* console.error('UUID-App-Container nicht gefunden!');
* }
* });
*/
const appmodUUID = (() => {
// Standardeinstellungen
let _settings = {
targetElement: null,
uuidLength: 5,
onGenerateCallback: null
};

// Referenzen zu erstellten DOM-Elementen zur späteren Verwaltung
let _containerElement = null;
let _uuidDisplayElement = null;
let _generateButtonElement = null;
let _styleElement = null; // Für das dynamisch eingefügte CSS

// Internes CSS für den Generator
const _componentCSS = `
.uuid-generator-container {
background-color: #ffffff;
border-radius: 12px;
box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
padding: 40px;
text-align: center;
max-width: 450px;
width: 100%;
border: 1px solid #e0e0e0;
margin: 20px auto; /* Zentrierung für Standalone-Test */
font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
color: #333;
line-height: 1.6;
}

.uuid-display-label {
font-size: 1.1em;
margin-bottom: 15px;
color: #555;
font-weight: 500;
}

.uuid-display {
display: block;
background-color: #e9ecef;
color: #2c3e50;
font-family: 'Consolas', 'Monaco', monospace;
font-size: 1.6em;
padding: 15px 20px;
margin-bottom: 30px;
border-radius: 8px;
word-break: break-all;
user-select: all;
cursor: text;
font-weight: bold;
border: 1px solid #dcdcdc;
transition: background-color 0.2s ease, border-color 0.2s ease;
}

.uuid-display:hover {
background-color: #e2e6ea;
border-color: #c9c9c9;
}

.uuid-generate-button {
background-color: #007bff;
color: white;
padding: 14px 28px;
font-size: 1.1em;
border: none;
border-radius: 8px;
cursor: pointer;
transition: background-color 0.2s ease, transform 0.1s ease;
box-shadow: 0 4px 10px rgba(0, 123, 255, 0.2);
font-weight: 600;
}

.uuid-generate-button:hover {
background-color: #0056b3;
transform: translateY(-1px);
}

.uuid-generate-button:active {
background-color: #004085;
transform: translateY(1px);
box-shadow: 0 2px 5px rgba(0, 123, 255, 0.2);
}

.uuid-config-info {
font-size: 0.9em;
color: #888;
margin-top: 25px;
}

.uuid-config-info strong {
color: #333;
}
`;

/**
* Generiert eine zufällige alphanumerische Zeichenkette.
* @param {number} length - Die Länge der zu generierenden Zeichenkette.
* @returns {string} Eine zufällige alphanumerische Zeichenkette.
*/
function _generateRandomUUID(length) {
const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
let result = '';
for (let i = 0; i < length; i++) {
result += chars.charAt(Math.floor(Math.random() * chars.length));
}
return result;
}

/**
* Behandelt den Klick-Event des Generate-Buttons.
*/
function _handleGenerateButtonClick() {
const newUUID = _generateRandomUUID(_settings.uuidLength);
if (_uuidDisplayElement) {
_uuidDisplayElement.textContent = newUUID;
}
if (typeof _settings.onGenerateCallback === 'function') {
_settings.onGenerateCallback(newUUID);
}
}

const publicAPI = {
/**
* Getter und Setter für die Einstellungen.
* Merge-Strategie: Neue Einstellungen überschreiben oder ergänzen vorhandene.
*/
set settings(newSettings) {
_settings = { ..._settings, ...newSettings };
},
get settings() {
return { ..._settings }; // Rückgabe einer Kopie, um direkte Manipulation zu vermeiden
},

/**
* Initialisiert und rendert die UI des UUID-Generators.
*/
init: function() {
if (!_settings.targetElement || !(_settings.targetElement instanceof HTMLElement)) {
console.error('appmodUUID: Ein gültiges targetElement muss in den Einstellungen angegeben werden.');
return;
}

// Sicherstellen, dass die UI nicht mehrfach initialisiert wird
if (_containerElement) {
console.warn('appmodUUID: UI ist bereits initialisiert. Zuerst "destroy()" aufrufen.');
return;
}

// CSS dynamisch in den Header einfügen
_styleElement = document.createElement('style');
_styleElement.textContent = _componentCSS;
document.head.appendChild(_styleElement);

// Haupt-Container
_containerElement = document.createElement('div');
_containerElement.classList.add('uuid-generator-container');

// Beschriftung für die UUID-Anzeige
const label = document.createElement('p');
label.classList.add('uuid-display-label');
label.textContent = 'Generiertes ID-Token:';
_containerElement.appendChild(label);

// UUID-Anzeige-Element
_uuidDisplayElement = document.createElement('span');
_uuidDisplayElement.id = 'uuid-display-' + Math.random().toString(36).substr(2, 9); // Einzigartige ID
_uuidDisplayElement.classList.add('uuid-display');
_uuidDisplayElement.textContent = _generateRandomUUID(_settings.uuidLength); // Erste UUID direkt generieren
_containerElement.appendChild(_uuidDisplayElement);

// Button zum Generieren der UUID
_generateButtonElement = document.createElement('button');
_generateButtonElement.id = 'generate-button-' + Math.random().toString(36).substr(2, 9); // Einzigartige ID
_generateButtonElement.classList.add('uuid-generate-button');
_generateButtonElement.textContent = 'Neue UUID generieren';
_generateButtonElement.addEventListener('click', _handleGenerateButtonClick);
_containerElement.appendChild(_generateButtonElement);

// Info zur aktuellen Länge
const infoText = document.createElement('p');
infoText.classList.add('uuid-config-info');
infoText.innerHTML = `Aktuelle Länge: <strong>${_settings.uuidLength}</strong> Zeichen`;
_containerElement.appendChild(infoText);

// Füge den gesamten Container zum Ziel-Element hinzu
_settings.targetElement.appendChild(_containerElement);

// Rufe den Callback für die erste generierte UUID auf, falls vorhanden
if (typeof _settings.onGenerateCallback === 'function') {
_settings.onGenerateCallback(_uuidDisplayElement.textContent);
}
},

/**
* Entfernt die gesamte UI des UUID-Generators und räumt Event-Listener auf.
*/
destroy: function() {
if (_containerElement && _settings.targetElement) {
// Event Listener entfernen
if (_generateButtonElement) {
_generateButtonElement.removeEventListener('click', _handleGenerateButtonClick);
}

// UI-Elemente aus dem DOM entfernen
_settings.targetElement.removeChild(_containerElement);

// Dynamisch injiziertes CSS entfernen
if (_styleElement && document.head.contains(_styleElement)) {
document.head.removeChild(_styleElement);
}

// Referenzen zurücksetzen
_containerElement = null;
_uuidDisplayElement = null;
_generateButtonElement = null;
_styleElement = null;
} else {
console.warn('appmodUUID: Keine aktive UI zum Entfernen gefunden.');
}
},

/**
* Generiert programmatisch eine neue UUID und aktualisiert die Anzeige.
* Löst auch den onGenerateCallback aus, falls definiert.
*/
generate: function() {
if (_uuidDisplayElement) {
_handleGenerateButtonClick(); // Nutzt die gleiche Logik wie der Button-Klick
} else {
console.warn('appmodUUID: UI ist nicht initialisiert. "init()" zuerst aufrufen.');
}
}
};

return publicAPI;
})();