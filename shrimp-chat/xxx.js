// xx.js — Beispielbasis für Patch-Tests

// --- State ---
let ably = null;
let channel = null;
let aesKey = null;
let joined = false;

// --- Hilfsfunktionen ---
function log(msg) {
  console.log("[LOG]", msg);
}

function randomName() {
  return "shrimp-" + Math.floor(Math.random() * 1000);
}

// --- Verbindung herstellen ---
async function connect(apiKey, clientId) {
  log("Verbinde mit Ably...");
  // Dummy-Verbindung
  ably = { key: apiKey, clientId };
  channel = { name: "test-room" };
  joined = true;
  log("Verbunden als " + clientId);
}

// --- Nachricht senden ---
async function publishMessage(text) {
  if (!joined) {
    log("Nicht verbunden!");
    return;
  }
  const payload = {
    v: 1,
    ciphertext: "dummy-" + text,
    meta: { author: ably.clientId }
  };
  log("Nachricht gesendet: " + JSON.stringify(payload));
}

// --- Nachricht empfangen ---
function subscribeMessage(msg) {
  try {
    const payload = msg.data;
    const plaintext = "dummy-decrypt:" + payload.ciphertext;
    log("Nachricht empfangen von " + payload.meta.author + ": " + plaintext);
  } catch (e) {
    log("Fehler beim Entschlüsseln: " + e.message);
  }
}