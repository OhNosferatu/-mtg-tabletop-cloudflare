import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H66 patch failed: ${label}`);
  source=source.replace(from,to);
}

// Remove H65's secondary reveal-state flag. The physical top card's faceDown
// value is the single source of truth for both the label and the action.
replaceOnce(
  'remove separate Reveal Top tracking state',
  'let deckActionBusy=false,revealedTopId=null;',
  'let deckActionBusy=false;'
);

replaceOnce(
  'Reveal button label follows actual top-card face',
  "  const top=deckVisibleCard();\n  if(revealedTopId&&(!top||top.id!==revealedTopId||top.faceDown))revealedTopId=null;\n  const revealBtn=z.querySelector('button[data-deck-action=\"reveal\"]');\n  if(revealBtn)revealBtn.textContent=revealedTopId&&top&&top.id===revealedTopId&&!top.faceDown?'Unreveal Card':'Reveal Top';",
  "  const top=deckVisibleCard();\n  const revealBtn=z.querySelector('button[data-deck-action=\"reveal\"]');\n  if(revealBtn)revealBtn.textContent=top&&!top.faceDown?'Unreveal Card':'Reveal Top';"
);

replaceOnce(
  'Reveal action directly toggles physical top card',
  "  if(action==='reveal'){\n    const c=deckVisibleCard();\n    if(!c)return;\n    const unreveal=revealedTopId===c.id&&!c.faceDown;\n    if(unreveal){\n      c.faceDown=true;revealedTopId=null;deckPreviewReveal=false;preview=c;\n      render();syncDeckPileVisual();renderDeckOverlay();\n      return;\n    }\n    c.faceDown=false;revealedTopId=c.id;deckPreviewReveal=false;preview=c;\n    render();syncDeckPileVisual();renderDeckOverlay();\n    if(!frontImage(c)){await load(c);if(c===deckVisibleCard()){render();syncDeckPileVisual();renderDeckOverlay()}}\n    return;\n  }",
  "  if(action==='reveal'){\n    const c=deckVisibleCard();\n    if(!c)return;\n    c.faceDown=!c.faceDown;deckPreviewReveal=false;preview=c;\n    render();syncDeckPileVisual();renderDeckOverlay();\n    if(!c.faceDown&&!frontImage(c)){await load(c);if(c===deckVisibleCard()){render();syncDeckPileVisual();renderDeckOverlay()}}\n    return;\n  }"
);

replaceOnce(
  'Flip Deck preserves every card individual orientation',
  "  if(action==='flipdeck'){\n    revealedTopId=null;\n    st.deck.reverse();\n    st.deckFlipped=!st.deckFlipped;\n    st.deck.forEach(id=>{const c=st.cards[id];if(c)c.faceDown=!st.deckFlipped});",
  "  if(action==='flipdeck'){\n    st.deck.reverse();\n    st.deckFlipped=!st.deckFlipped;\n    st.deck.forEach(id=>{const c=st.cards[id];if(c)c.faceDown=!c.faceDown});"
);

fs.writeFileSync(path,source);
console.log('Applied H66 robust Reveal/Unreveal toggle and orientation-preserving Flip Deck patch');
