// js/toast-notification.js
(function() {
const toastContainerId = 'toast-container';
let toastContainer = document.getElementById(toastContainerId);

// Create toast container if it doesn't exist
if (!toastContainer) {
toastContainer = document.createElement('div');
toastContainer.id = toastContainerId;
document.body.appendChild(toastContainer);
}

class Toast {
constructor(message, type = 'info', duration = 4000) {
this.message = message;
this.type = type;
this.duration = duration;
this.element = this.createToastElement();
this.show();
}

createToastElement() {
const toastDiv = document.createElement('div');
toastDiv.className = `toast toast-${this.type}`;
toastDiv.textContent = this.message;

// Add close button
const closeBtn = document.createElement('span');
closeBtn.className = 'toast-close-btn';
closeBtn.innerHTML = '&times;';
closeBtn.addEventListener('click', () => this.hide());
toastDiv.appendChild(closeBtn);

return toastDiv;
}

show() {
toastContainer.appendChild(this.element);
// Force reflow to enable CSS transition for sliding in
void this.element.offsetWidth;
this.element.classList.add('show');

if (this.duration > 0) {
setTimeout(() => this.hide(), this.duration);
}
}

hide() {
this.element.classList.remove('show');
this.element.classList.add('hide'); // Add hide class for fading out
this.element.addEventListener('transitionend', () => {
if (this.element.parentNode) {
this.element.parentNode.removeChild(this.element);
}
}, { once: true });
}

static success(message, duration) {
new Toast(message, 'success', duration);
}

static error(message, duration) {
new Toast(message, 'error', duration);
}

static info(message, duration) {
new Toast(message, 'info', duration);
}

static warning(message, duration) {
new Toast(message, 'warning', duration);
}

static message(message, duration) { // Generic message type
new Toast(message, 'message', duration);
}
}

// Expose Toast globally
window.Toast = Toast;
})();