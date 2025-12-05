	//  
	//<script src="js/_clientBroadcastSW-mod.js" id="clientbroadcast-script"></script>
	// icnlude document.getElementById("webappversion")
	// Set up channel

const broadcast = new BroadcastChannel('count-channel');

// Listen to the response
broadcast.onmessage = (event) => {
	document.getElementById("webappversion").textContent = event.data.payload;
  console.log(event.data.payload);
};

// Send first request
broadcast.postMessage({
 	 type: 'INCREASE_COUNT',
});