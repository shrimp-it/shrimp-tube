/**
 * shrimpcore-local-storage.js
 * Core Management Module for Local Storage (Two-Stage Approach)
 * & Storage Management Console
 */

const LS_PREFIX_VAULT = "shrimp_vault_";
const LS_PREFIX_SESSION = "shrimp_appdata_";

// --- Helper Functions ---

const getVaultKey = (user) => `${LS_PREFIX_VAULT}${user}`;
const getSessionKey = (user, mainKey) => `${LS_PREFIX_SESSION}${user}_${mainKey}`;

// --- Core Storage Operations ---

/**
 * Stage 1: Save User Data (Vault)
 * Stores API keys, preferences, and initialization data.
 */
export const saveVaultData = (user, dataObject) => {
    if (!user) return;
    const key = getVaultKey(user);
    const existing = loadVaultData(user) || {};
    const merged = { ...existing, ...dataObject };
    localStorage.setItem(key, JSON.stringify(merged));
    console.log(`[CoreLS] Vault updated for ${user}`);
};

/**
 * Stage 1: Load User Data (Vault)
 */
export const loadVaultData = (user) => {
    if (!user) return null;
    const key = getVaultKey(user);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
};

/**
 * Stage 2: Save Session Data (App Data)
 * Stores Chat History, UI state specific to a session.
 */
export const saveSessionData = (user, mainKey, dataObject) => {
    if (!user || !mainKey) return;
    const key = getSessionKey(user, mainKey);
    localStorage.setItem(key, JSON.stringify(dataObject));
    // console.log(`[CoreLS] Session saved for ${key}`);
};

/**
 * Stage 2: Load Session Data (App Data)
 */
export const loadSessionData = (user, mainKey) => {
    if (!user || !mainKey) return null;
    const key = getSessionKey(user, mainKey);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
};

/**
 * Utility: Delete a specific key
 */
export const deleteLsKey = (key) => {
    localStorage.removeItem(key);
};

// --- Storage Management Console (UI) ---

export const openStorageConsole = () => {
    // Remove existing console if open
    const existing = document.getElementById('shrimp-ls-console');
    if (existing) existing.remove();

    // Create Modal Structure
    const modal = document.createElement('div');
    modal.id = 'shrimp-ls-console';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.85); z-index: 10000; color: #fff;
        display: flex; flex-direction: column; font-family: monospace;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        padding: 10px 20px; background: #222; border-bottom: 1px solid #444;
        display: flex; justify-content: space-between; align-items: center;
    `;
    header.innerHTML = `<h3>🦐 LS-Management Console</h3>`;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '❌';
    closeBtn.style.cssText = `background:none; border:none; font-size: 1.5rem; cursor: pointer; color: white;`;
    closeBtn.onclick = () => modal.remove();
    header.appendChild(closeBtn);

    const content = document.createElement('div');
    content.style.cssText = `padding: 20px; overflow-y: auto; flex: 1;`;

    // Render Keys
    const list = document.createElement('div');
    list.id = 'ls-key-list';
    
    renderKeysList(list);

    content.appendChild(list);
    modal.appendChild(header);
    modal.appendChild(content);
    document.body.appendChild(modal);
};

const renderKeysList = (container) => {
    container.innerHTML = '';
    const keys = Object.keys(localStorage).filter(k => k.startsWith('shrimp_')).sort();

    if (keys.length === 0) {
        container.innerHTML = '<p>No Shrimp-AI data found in Local Storage.</p>';
        return;
    }

    keys.forEach(key => {
        const item = document.createElement('div');
        item.style.cssText = `
            margin-bottom: 10px; border: 1px solid #444; background: #1a1a1a;
            border-radius: 5px; overflow: hidden;
        `;

        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            padding: 8px; background: #333; cursor: pointer; display: flex;
            justify-content: space-between; align-items: center;
        `;
        
        const keyName = document.createElement('span');
        keyName.textContent = key;
        keyName.style.fontWeight = 'bold';
        
        const actions = document.createElement('div');
        
        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑️';
        delBtn.style.marginLeft = '10px';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if(confirm(`Delete key "${key}"?`)) {
                localStorage.removeItem(key);
                renderKeysList(container);
            }
        };

        actions.appendChild(delBtn);
        titleBar.appendChild(keyName);
        titleBar.appendChild(actions);

        const valueView = document.createElement('pre');
        valueView.style.cssText = `
            display: none; padding: 10px; margin: 0; background: #111;
            color: #0f0; white-space: pre-wrap; word-break: break-all; font-size: 0.8rem;
        `;

        // Toggle View
        titleBar.onclick = () => {
            const isHidden = valueView.style.display === 'none';
            if (isHidden) {
                try {
                    const val = localStorage.getItem(key);
                    const obj = JSON.parse(val);
                    valueView.textContent = JSON.stringify(obj, null, 2);
                } catch (e) {
                    valueView.textContent = localStorage.getItem(key);
                }
                valueView.style.display = 'block';
            } else {
                valueView.style.display = 'none';
            }
        };

        item.appendChild(titleBar);
        item.appendChild(valueView);
        container.appendChild(item);
    });
};