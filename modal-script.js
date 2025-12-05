/**
* modal-script.js
*
* Handles the logic for toolbar buttons (BOBTNS) and custom modals (BOMODAL),
* including dynamic iframe creation for my-2ix2-tv.html.
* Depends on global-utils.js for logging.
*/

// Ensure global utilities are available
// window.logDebug, window.logWarn, window.logError

const BOBTNS = {};
BOBTNS.ini = () => {
logDebug("Initializing BOBTNS (toolbar buttons).");
const buttons = document.querySelectorAll(".view-col-btn");
buttons.forEach((button) => {
button.dataset.currentColumns = "1";
button.dataset.selectedOption = null;
});

function setColumnCount(button, numColumns) {
const columnOptions = button.nextElementSibling;
if (!columnOptions) return;
button.dataset.currentColumns = numColumns;

Array.from(columnOptions.children).forEach((option) => {
option.classList.remove("selected");
if (numColumns && option.dataset.columns === numColumns.toString()) {
option.classList.add("selected");
button.dataset.selectedOption = option.dataset.columns;
}
});
}

function toggleColumnOptions(button) {
const columnOptions = button.nextElementSibling;
if (!columnOptions) {
logWarn("toggleColumnOptions: No nextElementSibling found for button.", button);
return;
}
columnOptions.style.display =
columnOptions.style.display === "none" ? "grid" : "none";
}

function hideAllColumnOptions() {
document.querySelectorAll(".column-options").forEach((options) => {
options.style.display = "none";
});
}

buttons.forEach((button) => {
button.addEventListener("click", (event) => {
hideAllColumnOptions();
toggleColumnOptions(button);
event.stopPropagation();
});
});

document.addEventListener("click", (event) => {
// Check if the click was inside any .column-options to prevent closing when interacting with options
if (!event.target.closest('.column-options') && !event.target.closest('.view-col-btn')) {
hideAllColumnOptions();
}
});


document.querySelectorAll(".column-options").forEach((columnOptions) => {
columnOptions.querySelectorAll(".column-option.ok").forEach((option) => {
option.addEventListener("click", (e) => {
const button = columnOptions.previousElementSibling;
const numColumns = e.target.dataset.columns;
const res = e.target.dataset.myres || numColumns;

setColumnCount(button, numColumns);
let datatarget = button.querySelector(".datatarget");
if (!datatarget) {
datatarget = document.createElement('span');
datatarget.classList.add('datatarget');
datatarget.style = 'position:absolute;margin:0;margin-left:-5px;margin-top:-3px;padding:0;background:transparent';
button.appendChild(datatarget);
}
datatarget.textContent = `${res}`;

hideAllColumnOptions();
e.stopPropagation();
});
});

columnOptions
.querySelectorAll(".column-option.gestoppt")
.forEach((element) => {
element.addEventListener("click", (event) => {
const button = columnOptions.previousElementSibling;
const numColumns = event.target.dataset.columns;

setColumnCount(button, numColumns);
event.stopImmediatePropagation(); // Prevent propagation to document click handler
event.stopPropagation();
event.preventDefault(); // Prevent default action for specific elements if any
});
});
});
logDebug("BOBTNS (toolbar buttons) initialized.");
};

const BOMODAL = {};

// NEW: Expose a function to open myboModal3 with a dynamic iframe source
window.openMyboModal3WithIframe = (iframeSrc) => {
logDebug(`Attempting to open myboModal3 with iframe source: ${iframeSrc}`);
const myboModal3 = document.getElementById("myboModal3");
const bomodal3Body = myboModal3 ? myboModal3.querySelector(".bomodal-body") : null;

if (!myboModal3 || !bomodal3Body) {
logError("myboModal3 or its body not found in DOM.");
return;
}

let iframe = bomodal3Body.querySelector("#dynamic-bomodal-iframe");

if (!iframe) {
iframe = document.createElement("iframe");
iframe.id = "dynamic-bomodal-iframe";
iframe.style.minHeight = "400px"; // Adjust as needed
iframe.style.width = "100%";
iframe.style.height = "100%"; // Ensure it fills the modal body
iframe.style.border = "none";
bomodal3Body.appendChild(iframe);
logDebug("Dynamically created iframe for myboModal3.");
}

// Set the source of the iframe
iframe.src = iframeSrc;
myboModal3.style.display = "block";
logDebug(`myboModal3 opened with dynamic iframe src: ${iframeSrc}.`);
};


BOMODAL.ini = () => {
logDebug("Initializing BOMODAL (custom modals).");

const myboModal = document.getElementById("myboModal");
const myboModal2 = document.getElementById("myboModal2");
const myboModal3 = document.getElementById("myboModal3"); // The modal for the dynamic iframe

const btn = document.getElementById("myBtn");
const btn2 = document.getElementById("myBtn2");
const btn3 = document.getElementById("myBtn3"); // Button to open myboModal3 (ServusTV)

const closeSpans = document.getElementsByClassName("close"); // All close buttons for custom modals

// Explicitly ensure all custom modals are initially hidden
if (myboModal) myboModal.style.display = "none";
if (myboModal2) myboModal2.style.display = "none";
if (myboModal3) myboModal3.style.display = "none";
logDebug("All custom modals explicitly hidden on BOMODAL.ini call.");


if (btn) {
btn.onclick = function () {
if (myboModal) myboModal.style.display = "block";
logDebug("myboModal opened (🍤lists).");
};
}
if (btn2) {
btn2.onclick = function () {
if (myboModal2) myboModal2.style.display = "block";
logDebug("myboModal2 opened (🍤nav).");
};
}

// ### Dynamic Iframe for myboModal3 (ServusTV) - now uses the exposed function ###
if (btn3 && myboModal3) {
btn3.onclick = function () {
window.openMyboModal3WithIframe("miniapps/_x-shrimp-playlist-manager.html");
logDebug("myboModal3 opened with miniapps/_x-shrimp-playlist-manager.html");
};
} else {
logWarn("myBtn3 or myboModal3 not found, miniapps/_x-shrimp-playlist-manager.html");
}

// Attach click handlers to all close buttons for custom modals
Array.from(closeSpans).forEach(span => {
span.onclick = function () {
const modal = this.closest(".bomodal");
if (modal) {
modal.style.display = "none";
logDebug(`${modal.id} closed by close button.`);
// --- CLEANED UP: No longer sending messages to shrimp-editor-ai-frame.html on myboModal3 close ---
}
};
});


// When the user clicks anywhere outside of the custom modals, close them
window.addEventListener('click', function (event) {
if (event.target === myboModal) {
if (myboModal) myboModal.style.display = "none";
logDebug("myboModal closed by outside click.");
}
if (event.target === myboModal2) {
if (myboModal2) myboModal2.style.display = "none";
logDebug("myboModal2 closed by outside click.");
}
if (event.target === myboModal3) {
if (myboModal3) myboModal3.style.display = "none";
logDebug("myboModal3 closed by outside click.");
// --- CLEANED UP: No longer sending messages to shrimp-editor-ai-frame.html on myboModal3 outside click ---
}
});
logDebug("BOMODAL (custom modals) initialized.");
};

// Initialize BOBTNS and BOMODAL once the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
BOBTNS.ini();
BOMODAL.ini();
logDebug("modal-script.js: BOBTNS and BOMODAL initialized on DOMContentLoaded.");
})