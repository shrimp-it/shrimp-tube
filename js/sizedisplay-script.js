 // ------------------------------userWindowSize------------------------- 
    // Fkt zum Auslesen und Speichern der aktuellen webbrowser Fenstergröße    
    // thresholdWindowSize die Grenzevon mobile zu desktop bei  Height  
    const thresholdWindowSize = 600;
    // ini der obj var userwindowsize
    const userWindowSize = {
      // Globales Objekt zur Speicherung der Fenstergröße
      width: 0,
      height: 0
    };
    // das anzupassende element im DOM
    // myuserWindow - getElementById('xxx'); -> darauf wirkt sih die änderung aus
    const myuserWindow = document.getElementById('sizeDisplay');

    function updateWindowSize() {
      userWindowSize.width = window.innerWidth;
      userWindowSize.height = window.innerHeight;
      myuserWindow.textContent =
        `Aktuelle Größe: ${userWindowSize.width}x${userWindowSize.height}px`;
      console.log(`Aktuelle Größe: ${userWindowSize.width}x${userWindowSize.height}px`);
      return {
        width: userWindowSize.width,
        height: userWindowSize.height
      };
    }
    // Basis-Event-Listener für automatische Updates
    window.addEventListener('resize', updateWindowSize);
    // Initiale Ausführung
    // Benutzerdefinierter Event-Listener mit Custom Event
    window.addEventListener('resize', function() {
      const size = updateWindowSize();
      // Erstellen und Dispatch eines Custom Events
      const resizeEvent = new CustomEvent('windowResized', {
        detail: {
          width: size.width,
          height: size.height
        }
      });
      window.dispatchEvent(resizeEvent);
    });

    // Reaktion auf das Custom Event
    window.addEventListener('windowResized', (e) => {
      // Zusätzliche Logik
      if (e.detail.width) {
        if (thresholdWindowSize <= e.detail.width) {
          myuserWindow.classList.remove('mobile');
          myuserWindow.classList.add('desktop');
        } else {
          myuserWindow.classList.remove('desktop');
          myuserWindow.classList.add('mobile');
        }
        console.log('resized event');
      }
    });
    // die akuelle window brutto größe der browser Anzeige
    const initialSize = updateWindowSize();
    if (initialSize) {
      console.log('initialSize set');
      if (thresholdWindowSize <= userWindowSize.width) {
        myuserWindow.classList.remove('mobile');
        myuserWindow.classList.add('desktop');
      } else {
        myuserWindow.classList.remove('desktop');
        myuserWindow.classList.add('mobile');
      }
    } 
/////////////////////