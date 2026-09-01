import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H60 patch failed: ${label}`);
  source=source.replace(from,to);
}

// A card moved onto the deck keeps its own physical face orientation.
replaceOnce(
  'deck reveal helper preserves incoming card face',
  "function revealForZone(c,zone){if(zone==='deck'){c.faceDown=!st.deckFlipped;return false}c.faceDown=false;return true}",
  "function revealForZone(c,zone){if(zone==='deck')return !c.faceDown;c.faceDown=false;return true}"
);

// The visible deck card is determined by that card's actual face state, not a
// global deck shortcut. Flip Deck still changes deck card faces explicitly.
replaceOnce(
  'visible deck face uses card orientation',
  "function deckIsPreview(){return !!preview&&preview.zone==='deck'&&st.deck[0]===preview.id}function deckVisibleCard(){return st.deck.length?st.cards[st.deck[0]]:null}function deckVisibleFaceUp(){const c=deckVisibleCard();return !!c&&(st.deckFlipped||!c.faceDown)}",
  "function deckIsPreview(){return !!preview&&preview.zone==='deck'&&st.deck[0]===preview.id}function deckVisibleCard(){return st.deck.length?st.cards[st.deck[0]]:null}function deckVisibleFaceUp(){const c=deckVisibleCard();return !!c&&!c.faceDown}"
);

// H59 injected the compact Hand-peek CSS immediately before creating the Scry
// tray. Add final H60 overrides there so the two trays cannot overlap and the
// Scry header is removed entirely.
replaceOnce(
  'compact non-overlapping Scry/Hand layout',
  "  document.head.appendChild(peekStyle);\n  tray=document.createElement('aside');",
  "  document.head.appendChild(peekStyle);\n  const compactScryStyle=document.createElement('style');\n  compactScryStyle.textContent='#scrytray{height:178px!important;max-height:min(178px,30dvh)!important;padding:7px 8px 9px!important;z-index:44!important}#scrytray .scry-head{display:none!important}#scrytray .scry-row{height:100%!important;padding:2px 3px 3px!important;align-items:flex-start!important}#hand.hand.scry-visible{transition:none!important;z-index:45!important}#hand.hand.scry-visible .handhead{height:18px!important;min-height:18px!important}#hand.hand.scry-visible #handrow{height:43px!important}@media(max-width:390px){#scrytray{height:170px!important;max-height:min(170px,30dvh)!important;padding:6px 7px 8px!important}#hand.hand.scry-visible{height:64px!important}#hand.hand.scry-visible #handrow{height:40px!important}}';\n  document.head.appendChild(compactScryStyle);\n  tray=document.createElement('aside');"
);

replaceOnce(
  'Scry tray gap above Hand',
  "  tray.style.bottom=Math.max(8,Math.round(window.innerHeight-r.top+8))+'px';",
  "  tray.style.bottom=Math.max(8,Math.round(window.innerHeight-r.top+12))+'px';"
);

replaceOnce(
  'Scry position after Hand compact mode settles',
  "  requestAnimationFrame(syncScryTrayPosition);",
  "  requestAnimationFrame(()=>requestAnimationFrame(syncScryTrayPosition));"
);

fs.writeFileSync(path,source);
console.log('Applied H60 deck-face preservation and compact non-overlapping Scry layout patch');
