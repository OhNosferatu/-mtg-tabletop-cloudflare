import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H65 patch failed: ${label}`);
  source=source.replace(from,to);
}

replaceOnce(
  'track the card revealed by Reveal Top',
  'let deckActionBusy=false;',
  'let deckActionBusy=false,revealedTopId=null;'
);

replaceOnce(
  'dynamic Reveal / Unreveal button label',
  "  if(status)status.textContent=st.deck.length+' cards · '+state;",
  "  if(status)status.textContent=st.deck.length+' cards · '+state;\n  const top=deckVisibleCard();\n  if(revealedTopId&&(!top||top.id!==revealedTopId||top.faceDown))revealedTopId=null;\n  const revealBtn=z.querySelector('button[data-deck-action=\"reveal\"]');\n  if(revealBtn)revealBtn.textContent=revealedTopId&&top&&top.id===revealedTopId&&!top.faceDown?'Unreveal Card':'Reveal Top';"
);

replaceOnce(
  'Reveal Top toggles back to face-down',
  "  if(action==='reveal'){\n    const c=deckVisibleCard();\n    if(!c)return;\n    c.faceDown=false;deckPreviewReveal=false;preview=c;\n    render();syncDeckPileVisual();renderDeckOverlay();\n    if(!frontImage(c)){await load(c);if(c===deckVisibleCard()){render();syncDeckPileVisual();renderDeckOverlay()}}\n    return;\n  }",
  "  if(action==='reveal'){\n    const c=deckVisibleCard();\n    if(!c)return;\n    const unreveal=revealedTopId===c.id&&!c.faceDown;\n    if(unreveal){\n      c.faceDown=true;revealedTopId=null;deckPreviewReveal=false;preview=c;\n      render();syncDeckPileVisual();renderDeckOverlay();\n      return;\n    }\n    c.faceDown=false;revealedTopId=c.id;deckPreviewReveal=false;preview=c;\n    render();syncDeckPileVisual();renderDeckOverlay();\n    if(!frontImage(c)){await load(c);if(c===deckVisibleCard()){render();syncDeckPileVisual();renderDeckOverlay()}}\n    return;\n  }"
);

replaceOnce(
  'Flip Deck clears Reveal Top toggle state',
  "  if(action==='flipdeck'){\n    st.deck.reverse();",
  "  if(action==='flipdeck'){\n    revealedTopId=null;\n    st.deck.reverse();"
);

fs.writeFileSync(path,source);
console.log('Applied H65 Reveal Top / Unreveal Card toggle patch');
