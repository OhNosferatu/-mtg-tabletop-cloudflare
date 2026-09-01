import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H67 patch failed: ${label}`);
  source=source.replace(from,to);
}

replaceOnce(
  'track deck-exit Hand and Scry presentation',
  'let deckActionBusy=false;',
  'let deckActionBusy=false,deckExitOpenHand=false,deckExitShowScry=false;'
);

replaceOnce(
  'show pending Hand or Scry only when deck overlay closes',
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

replaceOnce(
  'Draw keeps deck overlay open until user exits',
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

replaceOnce(
  'Scry keeps deck overlay open until user exits',
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

replaceOnce(
  'reset exit presentation when opening a fresh deck menu',
  `  const z=ensureDeckOverlay();
  preview=deckVisibleCard();deckPreviewReveal=false;deckOpenPending=false;
  z.classList.add('on');`,
  `  const z=ensureDeckOverlay();
  deckExitOpenHand=false;deckExitShowScry=false;
  preview=deckVisibleCard();deckPreviewReveal=false;deckOpenPending=false;
  z.classList.add('on');`
);

fs.writeFileSync(path,source);
console.log('Applied H67 persistent Draw/Scry deck overlay with exit Hand/Scry presentation');
