import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H68 patch failed: ${label}`);
  source=source.replace(from,to);
}

// H68 intentionally applies directly after H64. It consolidates the H65-H67
// behavior so Cloudflare does not depend on the failed intermediate patch chain.
replaceOnce(
  'deck overlay exit state',
  'let deckActionBusy=false;',
  'let deckActionBusy=false,deckExitOpenHand=false,deckExitShowScry=false;'
);

// Reveal/Unreveal label follows the physical state of the actual top card.
replaceOnce(
  'dynamic Reveal Top button label',
  "  if(status)status.textContent=st.deck.length+' cards · '+state;",
  "  if(status)status.textContent=st.deck.length+' cards · '+state;\n  const top=deckVisibleCard();\n  const revealBtn=z.querySelector('button[data-deck-action=\"reveal\"]');\n  if(revealBtn)revealBtn.textContent=top&&!top.faceDown?'Unreveal Card':'Reveal Top';"
);

// Only present Hand/Scry after the user deliberately exits the deck menu.
replaceOnce(
  'deck close presents pending Hand or Scry',
  `function closeDeckOverlay(){
  preview=null;deckPreviewReveal=false;deckActionBusy=false;deckOpenPending=false;
  clearTimeout(deckTapTimer);deckTapTimer=null;deckTapAt=0;
  const z=$('#deckoverlay');
  if(z){z.classList.remove('on');z.querySelectorAll('button[data-deck-action]').forEach(x=>x.disabled=false)}
}`,
  `function closeDeckOverlay(){
  preview=null;deckPreviewReveal=false;deckActionBusy=false;deckOpenPending=false;
  clearTimeout(deckTapTimer);deckTapTimer=null;deckTapAt=0;
  const z=$('#deckoverlay');
  if(z){z.classList.remove('on');z.querySelectorAll('button[data-deck-action]').forEach(x=>x.disabled=false)}
  const openHand=deckExitOpenHand&&st.hand.length>0;
  const showScry=deckExitShowScry&&st.scry.length>0;
  deckExitOpenHand=false;deckExitShowScry=false;
  if(openHand){
    const hand=$('#hand'),button=$('#closehand'),row=$('#handrow'),bar=$('#handscroll');
    hand?.classList.remove('closed');
    if(button){button.textContent='Close';button.setAttribute('aria-expanded','true')}
    if(row)row.scrollLeft=0;
    if(bar)bar.value=0;
    requestAnimationFrame(()=>requestAnimationFrame(syncHandScroller));
  }
  if(showScry)requestAnimationFrame(()=>renderScryHand());
}`
);

// Draw the card to the left of Hand, but keep the deck menu open.
replaceOnce(
  'Draw stays in deck overlay',
  `  if(action==='draw'){
    const id=st.deck.shift(),c=st.cards[id];
    c.zone='hand';c.faceDown=false;c.tap=false;st.hand.unshift(id);
    closeDeckOverlay();render();
    load(c).then(()=>{if(c.zone==='hand')render()});
    return;
  }`,
  `  if(action==='draw'){
    const id=st.deck.shift(),c=st.cards[id];
    c.zone='hand';c.faceDown=false;c.tap=false;st.hand.unshift(id);
    deckExitOpenHand=true;preview=deckVisibleCard();
    render();syncDeckPileVisual();renderDeckOverlay();
    load(c).then(()=>{if(c.zone==='hand'){render();renderDeckOverlay()}});
    return;
  }`
);

// Reveal Top is a true physical toggle of the top card.
replaceOnce(
  'Reveal Top toggles physical card',
  `  if(action==='reveal'){
    const c=deckVisibleCard();
    if(!c)return;
    c.faceDown=false;deckPreviewReveal=false;preview=c;
    render();syncDeckPileVisual();renderDeckOverlay();
    if(!frontImage(c)){await load(c);if(c===deckVisibleCard()){render();syncDeckPileVisual();renderDeckOverlay()}}
    return;
  }`,
  `  if(action==='reveal'){
    const c=deckVisibleCard();
    if(!c)return;
    c.faceDown=!c.faceDown;deckPreviewReveal=false;preview=c;
    render();syncDeckPileVisual();renderDeckOverlay();
    if(!c.faceDown&&!frontImage(c)){await load(c);if(c===deckVisibleCard()){render();syncDeckPileVisual();renderDeckOverlay()}}
    return;
  }`
);

// Flip the deck like a physical stack: reverse order and invert every card's
// current orientation. A double flip therefore restores any manually revealed
// card to the exact orientation it had before the first flip.
replaceOnce(
  'orientation-preserving Flip Deck',
  `  if(action==='flipdeck'){
    st.deck.reverse();
    st.deckFlipped=!st.deckFlipped;
    st.deck.forEach(id=>{const c=st.cards[id];if(c)c.faceDown=!st.deckFlipped});`,
  `  if(action==='flipdeck'){
    st.deck.reverse();
    st.deckFlipped=!st.deckFlipped;
    st.deck.forEach(id=>{const c=st.cards[id];if(c)c.faceDown=!c.faceDown});`
);

// Scry cards accumulate while the deck menu stays open. The private tray is
// surfaced only after the player closes the deck menu.
replaceOnce(
  'Scry stays in deck overlay',
  `async function scryOne(){
  if(!st.deck.length){closeDeckOverlay();render();return}
  const id=st.deck.shift(),c=st.cards[id];
  c.zone='scry';c.faceDown=false;c.tap=false;st.scry.push(id);
  closeDeckOverlay();render();renderScryHand();
  load(c).then(()=>{if(c.zone==='scry')renderScryHand()});
}`,
  `async function scryOne(){
  if(!st.deck.length){renderDeckOverlay();return}
  const id=st.deck.shift(),c=st.cards[id];
  c.zone='scry';c.faceDown=false;c.tap=false;st.scry.push(id);
  deckExitShowScry=true;preview=deckVisibleCard();
  render();syncDeckPileVisual();renderDeckOverlay();
  load(c).then(()=>{if(c.zone==='scry'){renderScryHand();renderDeckOverlay()}});
}`
);

// A newly opened deck menu starts with no pending exit presentation.
replaceOnce(
  'reset exit state on deck open',
  `  const z=ensureDeckOverlay();
  preview=deckVisibleCard();deckPreviewReveal=false;deckOpenPending=false;
  z.classList.add('on');`,
  `  const z=ensureDeckOverlay();
  deckExitOpenHand=false;deckExitShowScry=false;
  preview=deckVisibleCard();deckPreviewReveal=false;deckOpenPending=false;
  z.classList.add('on');`
);

fs.writeFileSync(path,source);
console.log('Applied H68 consolidated post-H64 deck interaction patch');
