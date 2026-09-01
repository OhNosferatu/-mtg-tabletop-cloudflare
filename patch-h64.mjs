import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H64 patch failed: ${label}`);
  source=source.replace(from,to);
}

// Keep only the deck actions that are useful in normal tabletop play.
replaceOnce(
  'remove Top-Bottom, Bottom-Top, and Cut buttons',
  '<button data-deck-action="reveal">Reveal Top</button><button data-deck-action="topbottom">Top → Bottom</button><button data-deck-action="bottomtop">Bottom → Top</button><button data-deck-action="shuffle">Shuffle</button><button data-deck-action="cut">Cut Deck</button><button data-deck-action="flipdeck">Flip Deck</button>',
  '<button data-deck-action="reveal">Reveal Top</button><button data-deck-action="shuffle">Shuffle</button><button data-deck-action="flipdeck">Flip Deck</button>'
);

// Reveal Top is a physical state change: the current top card remains on the
// library, but its face is turned up on the actual board pile.
replaceOnce(
  'Reveal Top makes the real top card face-up',
  "  if(action==='reveal'){\n    await refreshDeckAfterMutation(true);\n    return;\n  }",
  "  if(action==='reveal'){\n    const c=deckVisibleCard();\n    if(!c)return;\n    c.faceDown=false;deckPreviewReveal=false;preview=c;\n    render();syncDeckPileVisual();renderDeckOverlay();\n    if(!frontImage(c)){await load(c);if(c===deckVisibleCard()){render();syncDeckPileVisual();renderDeckOverlay()}}\n    return;\n  }"
);

// Flip Deck behaves like physically turning the entire library over: reverse
// card order, invert the deck orientation, and make the original bottom card
// the visible face-up card. Flipping again restores normal order/face-down state.
replaceOnce(
  'Flip Deck explicitly reverses and flips all deck cards',
  "  if(action==='flipdeck'){\n    st.deck.reverse();st.deckFlipped=!st.deckFlipped;syncDeckFaces();await refreshDeckAfterMutation(st.deckFlipped);\n  }",
  "  if(action==='flipdeck'){\n    st.deck.reverse();\n    st.deckFlipped=!st.deckFlipped;\n    st.deck.forEach(id=>{const c=st.cards[id];if(c)c.faceDown=!st.deckFlipped});\n    preview=deckVisibleCard();deckPreviewReveal=false;\n    render();syncDeckPileVisual();renderDeckOverlay();\n    const c=deckVisibleCard();\n    if(st.deckFlipped&&c&&!frontImage(c)){await load(c);if(c===deckVisibleCard()){render();syncDeckPileVisual();renderDeckOverlay()}}\n    return;\n  }"
);

fs.writeFileSync(path,source);
console.log('Applied H64 simplified deck controls and physical Reveal/Flip Deck behavior patch');
