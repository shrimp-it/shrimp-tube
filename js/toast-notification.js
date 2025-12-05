/**
* toast-notification.js
*
* Provides a non-blocking toast notification system for user feedback.
* Depends on a global `ShrimptubeApp.utils` object for logging.
*
* Usage:
* ShrimptubeApp.ui.showToast("Nachricht wurde gespeichert!", "success");
* ShrimptubeApp.ui.showToast("Fehler beim Laden der Daten.", "error", 5000);
* ShrimptubeApp.ui.showConfirm("Sind Sie sicher?", () => { console.log("Bestätigt!"); }, () => { console.log("Abgebrochen!"); });
*/

(function() {
// Stellen Sie sicher, dass ShrimptubeApp.utils verfügbar ist oder definieren Sie einen Fallback
const logDebug = window.ShrimptubeApp?.utils?.logDebug || console.log;
const logWarn = window.ShrimptubeApp?.utils?.logWarn || console.warn;
const logError = window.ShrimptubeApp?.utils?.logError || console.error;

// Fügen Sie das UI-Objekt zu ShrimptubeApp hinzu, falls es noch nicht existiert
window.ShrimptubeApp = window.ShrimptubeApp || {};
window.ShrimptubeApp.ui = window.ShrimptubeApp.ui || {};

const TOAST_TIMEOUT = 3000; // Standardanzeigedauer für Toasts in ms
let toastContainer;

// Initialisiert den Toast-Container im DOM
function _initToastContainer() {
if (!toastContainer) {
toastContainer = document.createElement('div');
toastContainer.id = 'shrimptube-toast-container';
// Grundlegende Styles für den Toast-Container
Object.assign(toastContainer.style, {
position: 'fixed',
bottom: '20px',
right: '20px',
zIndex: '10000', // Über allen anderen Elementen
display: 'flex',
flexDirection: 'column',
gap: '10px',
maxWidth: '300px'
});
document.body.appendChild(toastContainer);
logDebug("Toast container initialized.");
}
}

/**
* Zeigt eine nicht-blockierende Toast-Benachrichtigung an.
* @param {string} message - Die anzuzeigende Nachricht.
* @param {"info"|"success"|"warning"|"error"} [type="info"] - Der Typ der Nachricht für Styling.
* @param {number} [duration=TOAST_TIMEOUT] - Die Anzeigedauer in Millisekunden.
*/
function showToast(message, type = "info", duration = TOAST_TIMEOUT) {
if (!toastContainer) {
_initToastContainer();
}

const toast = document.createElement('div');
toast.classList.add('shrimptube-toast', `shrimptube-toast-${type}`);
toast.textContent = message;

// Styles für einzelne Toasts
Object.assign(toast.style, {
padding: '10px 15px',
borderRadius: '5px',
color: 'white',
backgroundColor: '#333',
boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
opacity: '0',
transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
transform: 'translateY(20px)',
cursor: 'pointer'
});

// Spezifische Typ-Styles
if (type === "success") toast.style.backgroundColor = '#28a745';
if (type === "error") toast.style.backgroundColor = '#dc3545';
if (type === "warning") toast.style.backgroundColor = '#ffc107';
if (type === "info") toast.style.backgroundColor = '#007bff';

toastContainer.appendChild(toast);

// Animation für Einblendung
setTimeout(() => {
toast.style.opacity = '1';
toast.style.transform = 'translateY(0)';
}, 100);

// Automatisch ausblenden
const timeoutId = setTimeout(() => {
toast.style.opacity = '0';
toast.style.transform = 'translateY(20px)';
toast.addEventListener('transitionend', () => toast.remove());
}, duration);

// Bei Klick entfernen
toast.addEventListener('click', () => {
clearTimeout(timeoutId); // Automatisches Ausblenden stoppen
toast.style.opacity = '0';
toast.style.transform = 'translateY(20px)';
toast.addEventListener('transitionend', () => toast.remove());
});

logDebug(`Toast displayed: [${type}] ${message}`);
}

/**
* Zeigt eine blockierende Bestätigungsanfrage an (ersetzt `confirm()`).
* Erstellt ein temporäres Modal für die Bestätigung.
* @param {string} message - Die Bestätigungsnachricht.
* @param {function} onConfirm - Callback-Funktion, wenn bestätigt wird.
* @param {function} [onCancel] - Callback-Funktion, wenn abgebrochen wird.
*/
function showConfirm(message, onConfirm, onCancel) {
const confirmModal = document.createElement('div');
Object.assign(confirmModal.style, {
position: 'fixed',
top: '0',
left: '0',
width: '100%',
height: '100%',
backgroundColor: 'rgba(0,0,0,0.6)',
zIndex: '10001',
display: 'flex',
justifyContent: 'center',
alignItems: 'center',
opacity: '0',
transition: 'opacity 0.3s ease-in-out'
});

const confirmBox = document.createElement('div');
Object.assign(confirmBox.style, {
backgroundColor: '#333',
color: 'white',
padding: '25px',
borderRadius: '8px',
boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
textAlign: 'center',
maxWidth: '400px',
width: '90%'
});

const msgPara = document.createElement('p');
msgPara.textContent = message;
Object.assign(msgPara.style, {
marginBottom: '20px',
fontSize: '1.1em',
lineHeight: '1.4'
});
confirmBox.appendChild(msgPara);

const buttonContainer = document.createElement('div');
Object.assign(buttonContainer.style, {
display: 'flex',
justifyContent: 'center',
gap: '15px'
});

const confirmBtn = document.createElement('button');
confirmBtn.textContent = 'Bestätigen';
Object.assign(confirmBtn.style, {
padding: '10px 20px',
borderRadius: '5px',
border: 'none',
backgroundColor: '#28a745',
color: 'white',
cursor: 'pointer',
transition: 'background-color 0.2s ease'
});
confirmBtn.onmouseover = () => confirmBtn.style.backgroundColor = '#218838';
confirmBtn.onmouseout = () => confirmBtn.style.backgroundColor = '#28a745';
confirmBtn.onclick = () => {
onConfirm();
confirmModal.remove();
logDebug("Confirm dialog: Confirmed.");
};
buttonContainer.appendChild(confirmBtn);

const cancelBtn = document.createElement('button');
cancelBtn.textContent = 'Abbrechen';
Object.assign(cancelBtn.style, {
padding: '10px 20px',
borderRadius: '5px',
border: 'none',
backgroundColor: '#dc3545',
color: 'white',
cursor: 'pointer',
transition: 'background-color 0.2s ease'
});
cancelBtn.onmouseover = () => cancelBtn.style.backgroundColor = '#c82333';
cancelBtn.onmouseout = () => cancelBtn.style.backgroundColor = '#dc3545';
cancelBtn.onclick = () => {
if (onCancel) onCancel();
confirmModal.remove();
logDebug("Confirm dialog: Cancelled.");
};
buttonContainer.appendChild(cancelBtn);

confirmBox.appendChild(buttonContainer);
confirmModal.appendChild(confirmBox);
document.body.appendChild(confirmModal);

// Animation für Einblendung
setTimeout(() => {
confirmModal.style.opacity = '1';
}, 50);

logDebug(`Confirm dialog displayed: ${message}`);
}

// Exponieren der Funktionen über das globale ShrimptubeApp.ui Objekt
window.ShrimptubeApp.ui.showToast = showToast;
window.ShrimptubeApp.ui.showConfirm = showConfirm;

// Ensure the toast container is initialized when the DOM is ready
document.addEventListener('DOMContentLoaded', _initToastContainer);
})();