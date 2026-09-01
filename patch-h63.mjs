import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H63 patch failed: ${label}`);
  source=source.replace(from,to);
}

// Main Draw 1 button: newest drawn card belongs at the far-left of Hand.
replaceOnce(
  'Draw 1 inserts at left of Hand',
  "async function drawOne(){if(!st.deck.length)return;const id=st.deck.shift(),c=st.cards[id];c.zone='hand';c.faceDown=false;st.hand.push(id);await load(c);render()}",
  "async function drawOne(){if(!st.deck.length)return;const id=st.deck.shift(),c=st.cards[id];c.zone='hand';c.faceDown=false;st.hand.unshift(id);await load(c);render()}"
);

// Deck overlay Draw action follows the same left-side insertion rule.
replaceOnce(
  'deck overlay Draw inserts at left of Hand',
  "c.zone='hand';c.faceDown=false;c.tap=false;st.hand.push(id);\n    closeDeckOverlay();render();",
  "c.zone='hand';c.faceDown=false;c.tap=false;st.hand.unshift(id);\n    closeDeckOverlay();render();"
);

// Hand-card taps must never reopen the legacy #inspect viewer. Use the same
// lightweight card viewer that is already stable for battlefield and Scry.
replaceOnce(
  'Hand card uses lightweight full-card viewer',
  "if(wasMoved)return;openCard(c,true)};",
  "if(wasMoved)return;openBoardZoom(c)};"
);

fs.writeFileSync(path,source);
console.log('Applied H63 left-side draw and lightweight Hand viewer patch');
