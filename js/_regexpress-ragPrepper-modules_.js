/**
 * @function myRagRepper
 * @param {RegExp} queryStringe - Der reguläre Ausdruck, der zum Suchen von Textfragmenten verwendet wird. Flags wie 'g' (global) und 'i' (case-insensitive) können Teil des RegExp sein (z.B. `/abc/gi`).
 * @param {string} bdelemIN - Die ID des HTML-Elements, aus dem der Text extrahiert werden soll.
 * @param {string} bdelemOUT - Die ID des HTML-Elements, in dem die Ergebnisse angezeigt werden sollen.
 * @throws {TypeError} Wenn `queryStringe` kein regulärer Ausdruck ist oder `bdelemIN` oder `bdelemOUT` keine gültigen Element-IDs sind.
 * @description Extrahiert Textfragmente aus dem innerHTML eines HTML-Elements,
 * das durch `bdelemIN` identifiziert wird, basierend auf dem regulären Ausdruck `queryStringe`.
 * Die gefundenen Fragmente werden dann formatiert und in das HTML-Element eingefügt,
 * das durch `bdelemOUT` identifiziert wird.
 *
 * Wichtig: Stelle sicher, dass das Element mit der ID `bdelemIN` existiert und
 * HTML-Inhalt enthält. Das Modul greift direkt auf `innerHTML` zu. Missbrauch
 * (z.B. mit sehr großen HTML-Strukturen oder ineffizienten RegExp) kann die
 * Performance beeinträchtigen.
 */

const _myRagRepper_ = (queryStringe, bdelemIN, bdelemOUT) => {
  // Validierung der Eingabeparameter
  if (!(queryStringe instanceof RegExp)) {
    throw new TypeError(
      "queryStringe muss ein regulärer Ausdruck (RegExp) sein."
    );
  }

  const elementIn = document.getElementById(bdelemIN);
  const elementOut = document.getElementById(bdelemOUT);

  if (!elementIn) {
    throw new TypeError(`Element mit der ID '${bdelemIN}' nicht gefunden.`);
  }

  if (!elementOut) {
    throw new TypeError(`Element mit der ID '${bdelemOUT}' nicht gefunden.`);
  }

  const gtexter = elementIn.textContent;
  const stre = gtexter;
  const resulte = stre.match(queryStringe);

  if (resulte) {
    resulte.forEach((strin) => {
      myOutPutter(strin, bdelemOUT);
    });
  }
};

/**
 * @private
 * @function myOutPutter
 * @param {string} strin - Die auszugebende Zeichenkette.
 * @param {string} bdelemOUT - Die ID des HTML-Elements, in dem die Ausgabe erfolgt.
 * @description Fügt eine Zeichenkette als neues Listenelement (<li>) in das
 * HTML-Element mit der ID `bdelemOUT` ein. Diese Funktion ist `private` und
 * sollte nicht direkt von außerhalb des Moduls aufgerufen werden.
 */
const myOutPutter = (strin, bdelemOUT) => {
  const elementOut = document.getElementById(bdelemOUT);
  const li = document.createElement("li");
  li.textContent = strin;
  elementOut.appendChild(li);
};

/**
 * @private
 * @function myConslog
 * @param {strin} strin - Die auszugebende Zeichenkette.
 * @param {elemConsole} elemConsole - Die ID des HTML-Elements, in dem die Ausgabe erfolgt.
 *
 */
const myConslog = (strin, elemConsole) => {
  if (!elemConsole) {
    if (!document.getElementById("ele-conslog")) {
      console.log(strin);
      return;
    }
  }
  const elementOut =
    document.getElementById(elemConsole) ||
    document.getElementById("ele-conslog");
  const li = document.createElement("li");
  li.textContent = strin;
  elementOut.appendChild(li);
};

//////////////////////////////////////
const thispage = {};

thispage.ini = function () {
  try {
    window.myRagRepper = _myRagRepper_;
  } catch (f) {
    myConslog("error");
    myConslog(f);
    myConslog(f.error);
  }

  if (window.myRagRepper && myOutPutter && myConslog) {
    /* 
         //TEST
          let btnNname = "ragprepper-btn";
              document.getElementById(btnNname).onclick = (function(){
            	  myRagRepper(/``.*``/ig, 'testdataid', 'paneRegEx');      
              });              
          let btnNname2 = "ragprepper2-btn";
           document.getElementById(btnNname2).onclick = (function(){          
            	  myRagRepper(/html.*`xhtml``>/ig, 'testdataid', 'paneRegEx');    
              });   
        */
    myConslog("window.myRagRepper && myOutPutter && myConslog verfügbar");
  } else {
    myConslog("funktion window.myRagRepper && myOutPutter && myConslog NOT-ok");
  }
};

thispage.ini();

/*<div id="testdataid">
<p id="testdataid3">
dy ```html> C11lick the button to do a case-w3schoolsinsensitive 6544233 F1Fsearch for PLZ in 996776 Roth Y1Ychsools.the button to ffffff search for schools in a string w3schools c Tel 0965 996778 z1z chs x/html`> dy html> C22lick the button3 to do a case-w3schoolsinsensitive 6544233 F1Fsearch for PLZ in 996776 Roth Y1Ychsools.t2he bu2tton to ffffff search for schools in a string w3schools c Tel 0965 996778 z1z chs `xhtml``>></p>
<div id="testdataid4">
dy ````html> 33Click the button to do a case-w3schoolsinsensitive 6544233 F1Fsearch for PLZ in 996776 Roth Y1Ychsools.the button to ffffff search for schools in a string w3schools c Tel 0965 996778 z1z chs x/html>dy html> C44lick the button24 to do a case-w3schoolsinsensitive 6544233 F1Fsearch for PLZ in 996776 Roth Y1Ychsools.t4he bu4tton to ffffff search for schools in a string w3schools c 44 x/html``>
</div>
 
</div> <!--div id="testdataid"-->
<div id="regprep-div">
<button onclick="myRagRepper(/``.*``/ig, 'testdataid', 'paneRegEx');" id="ragprepper-btn">RagPrepper</button>
<button id="ragprepper2-btn">RagPrepper2</button>

<div style="background-color: green" id="panemain1">
<ul id="paneRegEx">Results:</ul>
*/
