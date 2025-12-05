(function() {
const allNavItems = document.querySelectorAll(".main-nav li");
const allTabs = document.querySelectorAll(".tab");

allNavItems.forEach(navItem => {
navItem.addEventListener("click", function(e) {
e.preventDefault();

allNavItems.forEach(item => item.classList.remove("active"));
allTabs.forEach(tab => tab.classList.remove("active"));

this.classList.add("active");

const selector = this.querySelector("a").getAttribute("href");
document.querySelector(selector).classList.add("active");
});
});
  /*
  if ("serviceWorker" in navigator) {
     	console.log("CLIENT: service worker registration in progress.");
	
              navigator.serviceWorker.register("../service-worker.js")
	.then(function() {
		console.log("CLIENT: service worker registration complete.");
	})
	.catch(function() {
		console.log("CLIENT: service worker registration failure.");
	});
    } else {
	console.log("CLIENT: service worker is not supported.");
    }
   */
})();