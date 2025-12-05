    try {
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      var recognitionN = new SpeechRecognition();
      recognitionN.lang = 'de-DE';
    } catch (e) {
      console.error(e);
      document.querySelector('.no-browser-support').style.display = 'block';
      document.querySelector('.app').style.display = 'none';
    }
    const ActiveTxtarea = 'note-textarea';
    const noteTextarea = new function() {
      let eleobj = document.getElementById(ActiveTxtarea);
      return eleobj;
    }
    const instructions = document.getElementById('recording-instructions');
    const notesList = document.querySelector('ul#notes');
    let noteContent = '';
    // Get all notes from previous sessions and display them.
    const notes = getAllNotes();
    renderNotes(notes);
    /*-----------------------------
          Voice Recognition 
    ------------------------------*/
    recognitionN.continuous = true;
    recognitionN.onresult = function(event) {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      const mobileRepeatBug = (current == 1 && transcript == event.results[0][0].transcript);
      if (!mobileRepeatBug) {
        noteContent += transcript;
        noteTextarea.value = noteContent;
      }
    };
    recognitionN.onstart = function() {
      instructions.textContent = 'Spracherkennung aktiviert. Sprich ins Mikrofon.';
    };
    recognitionN.onspeechend = function() {
      instructions.textContent = 'kein weiterer Input? Spracherkennung wird deaktiviert';
    };
    recognitionN.onerror = function(event) {
      if (event.error == 'no-speech') {
        instructions.textContent = 'Spracherkennung kann keine Sprache erkennen. Versuch es noch einmal.';
      }
    };
    /*-----------------------------
          App buttons and input 
    ------------------------------*/
    document.getElementById('start-record-btn').addEventListener('click', () => {
      if (noteContent.length) {
        noteContent += ' ';
      }
      recognitionN.start();
    });
    document.getElementById('pause-record-btn').addEventListener('click', () => {
      recognitionN.stop();
      instructions.textContent = 'Voice recognition paused.';
    });
    noteTextarea.addEventListener('input', () => {
      noteContent = noteTextarea.value;
    });
    noteTextarea.addEventListener('change', () => {
      noteContent = noteTextarea.value;
    });
    noteTextarea.addEventListener('click', () => {
      noteContent = noteTextarea.value;
    });
    document.getElementById('save-note-btn').addEventListener('click', () => {
      recognitionN.stop();
      if (!noteContent.length) {
        instructions.textContent = 'Leere Notiz kann nicht gespeichert werden. Text in Nachricht eingeben.';
      } else {
        saveNote(new Date().toLocaleString(), noteContent);
        noteContent = '';
        renderNotes(getAllNotes());
        noteTextarea.value = '';
        instructions.textContent = 'erfolgreich gespeichert!';
      }
    });
    notesList.addEventListener('click', (e) => {
      e.preventDefault();
      const target = e.target;
      if (target.classList.contains('listen-note')) {
        const content = target.closest('.note').querySelector('.content').textContent;
        readOutLoud(content);
      }
      if (target.classList.contains('delete-note')) {
        const dateTime = target.closest('.note').querySelector('.date').textContent;
        deleteNote(dateTime);
        target.closest('.note').remove();
      }
      if (target.classList.contains('sel-note')) {
        var containery = document.getElementById('containery');
        var contenty = target.closest('.note').querySelector('.content').textContent;
        //alert('sel-note - plus ' + contenty);
        noteTextarea.value = contenty + '\n' + noteTextarea.value;
        if (noteTextarea.value.startsWith('\n') && noteTextarea.value.split('\n').length > 0) {
         // alert('split ');
          noteTextarea.value = noteTextarea.value.split('\n')[1]
        }
        noteTextarea.click();
      }
    });
    /*-----------------------------
          Speech Synthesis 
    ------------------------------*/
    function readOutLoud(message) {
      const speech = new SpeechSynthesisUtterance();
      speech.lang = 'de-DE';
      speech.text = message;
      speech.volume = 1;
      speech.rate = 0.85;
      speech.pitch = 1;
      window.speechSynthesis.speak(speech);
    }
    /*-----------------------------
          Helper Functions 
    ------------------------------*/
    function renderNotes(notes) {
      let html = '';
      if (notes.length) {
        notes.forEach((note) => {
          html += `<li class="note"><p class="header"><span class="date">${note.date}</span><a href="#" class="listen-note" title="Listen to Note">🔊</a><a href="#" class="delete-note" title="Delete">❌</a><a href="#" class="sel-note" title="Sel">✍</a> <p class="content">${note.content}</p></p> </li>`;
        });
      } else {
        html = '<li><p class="content">You don\'t have any notes yet.</p></li>';
      }
      notesList.innerHTML = html;
    }

    function saveNote(dateTime, contenta) {
      localStorage.setItem('note-' + dateTime, contenta);
    }

    function getAllNotes() {
      const notes = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('note-')) {
          notes.push({
            date: key.replace('note-', ''),
            content: localStorage.getItem(key),
          });
        }
      }
      return notes;
    }

    function deleteNote(dateTime) {
      localStorage.removeItem('note-' + dateTime);
    }