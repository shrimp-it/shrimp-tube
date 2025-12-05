/**
* Simuliert einen Klick auf ein DOM-Element. Das Element kann direkt übergeben werden
* oder über einen CSS-Selektor-String gefunden werden.
* Optional können Verzögerungen vor und nach dem Klick angewendet werden.
*
* @param {string|HTMLElement} target - Entweder ein CSS-Selektor-String (z.B. '#myButton', '.my-class')
* oder ein direktes HTMLElement-Objekt.
* @param {number} [delayBeforeClick=0] - Die Verzögerung in Millisekunden VOR dem Klick.
* Standardmäßig 0 (keine Verzögerung).
* @param {number} [delayAfterClick=0] - Die Verzögerung in Millisekunden NACH dem Klick.
* Standardmäßig 0 (keine Verzögerung).
* @returns {Promise<HTMLElement|null>} Ein Promise, das mit dem geklickten Element aufgelöst wird,
* oder mit null, wenn das Element nicht gefunden oder das Target ungültig war.
*/
async function simulateClick(target, delayBeforeClick = 0, delayAfterClick = 0) {
let element = null;
let identifierForLog = "";

if (typeof target === 'string') {
element = document.querySelector(target);
identifierForLog = `selector "${target}"`;
} else if (target instanceof HTMLElement) {
element = target;
identifierForLog = `element (ID: ${target.id || 'N/A'}, Tag: ${target.tagName})`;
} else {
console.error(`simulateClick: Ungültiger 'target'-Parameter übergeben. Erwartet wurde ein String (CSS-Selektor) oder ein HTMLElement. Erhalten:`, target);
return null;
}

if (!element) {
console.error(`simulateClick: Element mit ${identifierForLog} nicht gefunden. Klick kann nicht simuliert werden.`);
// Throw an error to propagate it to .catch() or try/catch
throw new Error(`Element with ${identifierForLog} not found.`);
// return null; // Alternativ: null zurückgeben und prüfen. Für .then() / async/await ist throw besser
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

console.log(`simulateClick: Starte Prozess für ${identifierForLog}...`);

if (delayBeforeClick > 0) {
console.log(`simulateClick: Warte ${delayBeforeClick}ms VOR dem Klick auf ${identifierForLog}...`);
await wait(delayBeforeClick);
}

element.click();
console.log(`simulateClick: Geklickt auf ${identifierForLog}.`);

if (delayAfterClick > 0) {
console.log(`simulateClick: Warte ${delayAfterClick}ms NACH dem Klick auf ${identifierForLog}...`);
await wait(delayAfterClick);
}

console.log(`simulateClick: Prozess für ${identifierForLog} abgeschlossen.`);
return element;
}

/**
* Simulate End
*** Wichtig: Return the next Promise return simulateClick('#button2', 0, 2000); 

simulateClick('#button1', 500, 1000)
.then(() => {
updateButtonStatus(1, '✅ Fertig');
updateGlobalStatus("Verarbeite Button 2 (.then())...", false, "Sequenz-Starter (.then())");
return simulateClick('#button2', 0, 2000); 
})
.then(() => {
updateButtonStatus(2, '✅ Fertig');
updateGlobalStatus("Verarbeite Button 3 (.then())...", false, "Sequenz-Starter (.then())");
return simulateClick('#button3', 1000, 500); 
})
.catch(error => {
})
.finally(() => {
startButtonAsync.disabled = false;
})
*****************
*/