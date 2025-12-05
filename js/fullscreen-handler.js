//////////////////////////////////////////////////////////////////////////////////////////////
/*	fullscreen-handler.js
  	ModulA:  always full (by all clicks)
  	ModulB - openFullscreeny() / openFullscreeny(element)
*/

//////////////////////////////////////////////////////////////////////////////////////////////
/* 	ModulA - addFSHandler(this) 
	--- addFSHandler(state) 
	--- start fullscreen-handler: 	addFSHandler('full') 
	--- stop fullscreen-handler: 	addFSHandler('no full') 
	--use with:
 	<button id="fulltggle" style="background:red;" onclick="this.textContent = addFSHandler(this);">full</button>
*/

function addFSHandler(state) {
    if(state.textContent!=='full') {
	removeFSHandler();
      	state.style.background = 'red';
    	return 'full';
     }
    document.addEventListener('click', myFSHandler);
    state.style.background = 'green';
    return 'no full';
}
 
function removeFSHandler() {
  try { 
        //document.exitFullscreen();
        closeFullscreeny()
     } catch (f) { 
   console.log('FAILED: document.exitFullscreen()'); 
    };
  document.removeEventListener('click', myFSHandler);
}

function myFSHandler(){
   try { 
         //document.documentElement.requestFullscreen();
        openFullscreeny();
       } catch (f) {
       console.log('FAILED: documentElement.requestFullscreen()');
     };   
}

//////////////////////////////////////////////////////////////////////////////////////////////
/*	 ModulB -  fullscreen all or element
	--openFullscreeny(ele)
	--openFullscreeny()
	--closeFullscreeny()
*/

function openFullscreeny(ele) {
      ele = ele || document.documentElement;

      if (ele.requestFullscreen) {
        ele.requestFullscreen();
      } else if (ele.mozRequestFullScreen) {
        /* Firefox */
        ele.mozRequestFullScreen();
      } else if (ele.webkitRequestFullscreen) {
        /* Chrome, Safari & Opera */
        ele.webkitRequestFullscreen();
      } else if (ele.msRequestFullscreen) {
        /* IE/Edge */
        ele.msRequestFullscreen();
      }
    }

    function closeFullscreeny() {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
///////////////////////////////////////////////