/*
  Shrimp Chat — Serverless E2E Gruppenchat mit Ably
  - Verschlüsselung: AES-GCM mit PBKDF2 (Passphrase -> Key)
  - Ably: Realtime Channels (publish/subscribe), Presence
  - Export/Import: User- und Room-Credentials via File System Access API (Fallback: Download)
*/

(() => {
  // --- Simple UI helpers ---
  const $ = (id) => document.getElementById(id);
  const logEl = $('log');
  const presenceEl = $('presence');
  const messagesEl = $('messages');
  const connStatusEl = $('connStatus');
  const channelNameEl = $('channelName');
  const keyInfoEl = $('keyInfo');

  function log(line, type='info') {
    const ts = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '[ERR]' : type === 'warn' ? '[WARN]' : '[INFO]';
    logEl.textContent += `${ts} ${prefix} ${line}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function badge(text) {
    const span = document.createElement('span');
    span.className = 'badge';
    span.textContent = text;
    return span;
  }

  function addMessage({ author, text, mine=false, time=new Date() }) {
    const item = document.createElement('div');
    item.className = 'msg' + (mine ? ' me' : '');
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${author} • ${time.toLocaleTimeString()}`;
    const body = document.createElement('div');
    body.className = 'text';
    body.textContent = text;
    item.appendChild(meta);
    item.appendChild(body);
    messagesEl.appendChild(item);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // --- Crypto helpers (Web Crypto API) ---
  async function deriveAesKey(passphrase, roomName, iterations=150000) {
    const enc = new TextEncoder();
    const salt = enc.encode(`shrimp-room:${roomName}`);
    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    return key;
  }

  async function encryptString(aesKey, plaintext) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder().encode(plaintext);
    const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc);
    return {
      iv: b64encode(iv),
      ciphertext: b64encode(new Uint8Array(ctBuf)),
    };
  }

  async function decryptToString(aesKey, payload) {
    const iv = b64decode(payload.iv);
    const ct = b64decode(payload.ciphertext);
    const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct);
    return new TextDecoder().decode(ptBuf);
  }

  function b64encode(uint8) {
    let binary = '';
    uint8.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  }
  function b64decode(str) {
    const binary = atob(str);
    const len = binary.length;
    const buf = new Uint8Array(len);
    for (let i=0; i<len; i++) buf[i] = binary.charCodeAt(i);
    return buf;
  }

  // --- State ---
  let ably = null;
  let channel = null;
  let aesKey = null;
  let joined = false;

  // --- UI elements ---
  const apiKeyInput = $('apiKey');
  const clientIdInput = $('clientId');
  const roomNameInput = $('roomName');
  const roomSecretInput = $('roomSecret');

  const genClientIdBtn = $('genClientId');
  const genSecretBtn = $('genSecret');
  const connectBtn = $('connectBtn');
  const leaveBtn = $('leaveBtn');

  const exportUserBtn = $('exportUser');
  const exportRoomBtn = $('exportRoom');
  const importUserFile = $('importUserFile');
  const importUserBtn = $('importUser');
  const importRoomFile = $('importRoomFile');
  const importRoomBtn = $('importRoom');

  const chatInput = $('chatInput');
  const sendBtn = $('sendBtn');

  // --- Generators ---
  function randomName() {
    const animals = ['shrimp','seahorse','coral','anemone','clam','krill','manta','orca','dolphin','eel','turtle','ray'];
    const adj = ['brisk','calm','bright','quiet','nimble','bold','gentle','swift','brave','lucky','chill','witty'];
    const n = animals[Math.floor(Math.random()*animals.length)];
    const a = adj[Math.floor(Math.random()*adj.length)];
    const num = Math.floor(Math.random()*1000).toString().padStart(3,'0');
    return `${n}-${a}-${num}`;
  }
  function randomSecret(length=20) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=[]{}';
    let out = '';
    for (let i=0;i<length;i++) out += chars[Math.floor(Math.random()*chars.length)];
    return out;
  }

  genClientIdBtn.addEventListener('click', () => {
    clientIdInput.value = randomName();
  });
  genSecretBtn.addEventListener('click', () => {
    roomSecretInput.value = randomSecret(24);
  });

  // --- Connect & Join Room ---
  connectBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const clientId = clientIdInput.value.trim() || randomName();
    const roomName = roomNameInput.value.trim();
    const roomSecret = roomSecretInput.value;

    if (!apiKey) return alert('Bitte API Key eintragen.');
    if (!roomName) return alert('Bitte Room Name eintragen.');
    if (!roomSecret || roomSecret.length < 12) return alert('Room Secret ist zu kurz (mind. 12 Zeichen).');

    try {
      connStatusEl.textContent = 'Verbinde…';
      log('Initialisiere Ably…');

      ably = new Ably.Realtime({
        key: apiKey,
        clientId,
        echoMessages: true,
        autoConnect: true,
      });

      ably.connection.on('connected', () => {
        connStatusEl.textContent = 'Verbunden';
        log(`Verbunden als ${clientId}`);
      });
      ably.connection.on('failed', (err) => {
        connStatusEl.textContent = 'Fehlgeschlagen';
        log(`Verbindung fehlgeschlagen: ${err && err.message}`, 'error');
      });

      aesKey = await deriveAesKey(roomSecret, roomName);
      keyInfoEl.textContent = `AES-GCM 256 • PBKDF2(salt=shrimp-room:${roomName})`;

      channelNameEl.textContent = roomName;
      channel = ably.channels.get(roomName);

      await channel.presence.enter({ user: clientId, at: Date.now() });
      joined = true;
      leaveBtn.disabled = false;
      chatInput.disabled = false;
      sendBtn.disabled = false;

      async function refreshPresence() {
        try {
          const members = await channel.presence.get();
          presenceEl.innerHTML = '';
          if (Array.isArray(members)) {
            members.forEach(m => {
              presenceEl.appendChild(badge(m.clientId || m.data?.user || 'unbekannt'));
            });
          } else {
            log('Keine Presence-Mitglieder verfügbar.');
          }
        } catch (e) {
          log('Presence Abruf fehlgeschlagen: ' + e.message, 'warn');
        }
      }
      await refreshPresence();

      channel.presence.subscribe('enter', refreshPresence);
      channel.presence.subscribe('update', refreshPresence);
      channel.presence.subscribe('leave', refreshPresence);

      channel.subscribe('message', async (msg) => {
        try {
          const payload = msg.data;
          if (!payload || !payload.ciphertext || !payload.iv) {
            log('Ungültige Nachricht empfangen (kein Ciphertext).', 'warn');
            return;
          }
          const plaintext = await decryptToString(aesKey, payload);
          addMessage({
            author: payload.meta?.author || msg.clientId || 'unbekannt',
            text: plaintext,
            mine: (msg.clientId === clientId),
            time: new Date(msg.timestamp || Date.now()),
          });
        } catch (e) {
          log('Entschlüsselung fehlgeschlagen: ' + e.message, 'error');
        }
      });

        log(`Channel "${roomName}" abonniert, Presence beigetreten.`);
    } catch (e) {
      log('Fehler beim Verbinden: ' + e.message, 'error');
      alert('Verbindung fehlgeschlagen. Details im Log.');
    }
  });

  // --- Leave Room ---
  leaveBtn.addEventListener('click', async () => {
    try {
      if (channel && joined) {
        await channel.presence.leave();
        joined = false;
      }
      if (ably) {
        ably.close();
        ably = null;
      }
      channel = null;
      aesKey = null;
      connStatusEl.textContent = 'Nicht verbunden';
      leaveBtn.disabled = true;
      chatInput.disabled = true;
      sendBtn.disabled = true;
      presenceEl.innerHTML = '';
      log('Verbindung geschlossen, Raum verlassen.');
    } catch (e) {
      log('Fehler beim Verlassen: ' + e.message, 'error');
    }
  });

  // --- Send message (encrypt then publish) ---
  async function publishMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    if (!channel || !aesKey) {
      return alert('Nicht verbunden oder Schlüssel fehlt.');
    }
    try {
      const encPayload = await encryptString(aesKey, text);
      const clientId = clientIdInput.value.trim();
      const payload = {
        v: 1,
        iv: encPayload.iv,
        ciphertext: encPayload.ciphertext,
        meta: { author: clientId }
      };
      await channel.publish('message', payload);
      chatInput.value = '';
    } catch (e) {
      log('Senden fehlgeschlagen: ' + e.message, 'error');
    }
  }

  chatInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      publishMessage();
    }
  });
  sendBtn.addEventListener('click', publishMessage);

  // --- Export/Import helpers ---
  function buildUserCredentials() {
    const data = {
      type: 'shrimp-user',
      version: 1,
      clientId: clientIdInput.value.trim(),
      note: 'User-Credentials für Shrimp Chat'
    };
    return data;
  }

  function buildRoomCredentials() {
    const data = {
      type: 'shrimp-room',
      version: 1,
      roomName: roomNameInput.value.trim(),
      roomSecret: roomSecretInput.value,
      note: 'Room-Credentials für Shrimp Chat (Passphrase enthalten!)'
    };
    return data;
  }

  async function saveTextFileSuggested(filename, text) {
    // Try File System Access API
    if (window.showSaveFilePicker) {
      try {
        const handle = await showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Text', accept: { 'text/plain': ['.txt'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
        return true;
      } catch (e) {
        log('Speichern abgebrochen/fehlgeschlagen: ' + e.message, 'warn');
        // Fallback to download
      }
    }
    // Fallback: trigger download
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
    return true;
  }

  exportUserBtn.addEventListener('click', async () => {
    const cred = buildUserCredentials();
    const username = cred.clientId || 'user';
    const filename = `${username}-usr-credentials.txt`;
    await saveTextFileSuggested(filename, JSON.stringify(cred, null, 2));
    log(`User-Credentials exportiert: ${filename}`);
  });

  exportRoomBtn.addEventListener('click', async () => {
    const cred = buildRoomCredentials();
    const room = cred.roomName || 'room';
    const filename = `${room}-room-credentials.txt`;
    await saveTextFileSuggested(filename, JSON.stringify(cred, null, 2));
    log(`Room-Credentials exportiert: ${filename}`);
  });

  importUserBtn.addEventListener('click', async () => {
    const file = importUserFile.files[0];
    if (!file) return alert('Bitte User-Credentials-Datei auswählen.');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.type !== 'shrimp-user') throw new Error('Ungültiger Typ');
      clientIdInput.value = data.clientId || '';
      log('User-Credentials importiert.');
    } catch (e) {
      log('Import User fehlgeschlagen: ' + e.message, 'error');
      alert('Import fehlgeschlagen. Details im Log.');
    }
  });

  importRoomBtn.addEventListener('click', async () => {
    const file = importRoomFile.files[0];
    if (!file) return alert('Bitte Room-Credentials-Datei auswählen.');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.type !== 'shrimp-room') throw new Error('Ungültiger Typ');
      roomNameInput.value = data.roomName || '';
      roomSecretInput.value = data.roomSecret || '';
      log('Room-Credentials importiert.');
    } catch (e) {
      log('Import Room fehlgeschlagen: ' + e.message, 'error');
      alert('Import fehlgeschlagen. Details im Log.');
    }
  });

  // --- Initial defaults ---
  clientIdInput.value = randomName();

})();