// offline-detector.js

(function() {
const DISPLAY_TIME = 2000; // 2 Sekunden

function updateOnlineStatus() {
if (navigator.onLine) {
showOnlineMessage();
setTimeout(hideOnlineMessage, DISPLAY_TIME);
} else {
showOfflineMessage();
setTimeout(hideOfflineMessage, DISPLAY_TIME);
}
}

function showOfflineMessage() {
let offlineMessage = document.getElementById('offline-message');
if (!offlineMessage) {
offlineMessage = document.createElement('div');
offlineMessage.id = 'offline-message';
offlineMessage.style.cssText = `
position: fixed;
top: 0;
left: 0;
width: 100%;
background-color: #f00;
color: #fff;
text-align: center;
padding: 10px;
z-index: 9999;
`;
offlineMessage.textContent = 'Du bist offline. Einige Funktionen sind möglicherweise nicht verfügbar.';
document.body.appendChild(offlineMessage);
}
}

function hideOfflineMessage() {
const offlineMessage = document.getElementById('offline-message');
if (offlineMessage) {
offlineMessage.remove();
}
}

function showOnlineMessage() {
let onlineMessage = document.getElementById('online-message');
if (!onlineMessage) {
onlineMessage = document.createElement('div');
onlineMessage.id = 'online-message';
onlineMessage.style.cssText = `
position: fixed;
top: 0;
left: 0;
width: 100%;
background-color: #0f0;
color: #000;
text-align: center;
padding: 10px;
z-index: 9999;
`;
onlineMessage.textContent = 'Du bist wieder online.';
document.body.appendChild(onlineMessage);
}
}

function hideOnlineMessage() {
const onlineMessage = document.getElementById('online-message');
if (onlineMessage) {
onlineMessage.remove();
}
}


window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

updateOnlineStatus(); // Initialer Check beim Laden der Seite
})();