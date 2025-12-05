function userconfirmDelete(deleteFunction, message = "Wirklich löschen?") {
      if (confirm(message)) {
        deleteFunction();
      }
    }


//////////////////////
/* Integrate like this - example:
document.querySelector('#delete-chats-button').addEventListener('click', (e) => {
    
    userconfirmDelete(() => {
        chatHistory.length = 0;
        chatsContainer.innerHTML = "";
        localStorage.removeItem(STORAGE_KEY);
      }, "Möchtest du den Chat-Verlauf wirklich löschen?"); // Angepasste Nachricht
      
    });
*/