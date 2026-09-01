import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from)) throw new Error(`H51 patch failed: ${label}`);
  source=source.replace(from,to);
}

replaceOnce(
  'deck open gesture state',
  'let deckActionBusy=false;',
  'let deckActionBusy=false,deckOpenPending=false,deckTapAt=0,deckTapTimer=null;'
);

const openStart=source.indexOf('async function openDeckOptions(){');
const openEnd=source.indexOf('\nfunction syncDeckFaces()',openStart);
if(openStart<0||openEnd<0) throw new Error('H51 patch failed: openDeckOptions block');

const opener=`function handleDeckTap(){
  if(!st.deck.length)return;
  const now=Date.now();
  if(deckTapAt&&now-deckTapAt<360){
    clearTimeout(deckTapTimer);deckTapTimer=null;deckTapAt=0;
    openDeckOptions();
    return;
  }
  deckTapAt=now;
  clearTimeout(deckTapTimer);
  const stamp=now;
  deckTapTimer=setTimeout(()=>{
    deckTapTimer=null;
    if(deckTapAt!==stamp)return;
    deckTapAt=0;
    openDeckOptions();
  },370);
}
function openDeckOptions(){
  if(!st.deck.length)return;
  const z=ensureDeckOverlay();
  if(z.classList.contains('on')){renderDeckOverlay();return}
  if(deckOpenPending)return;
  deckOpenPending=true;
  $('#inspect')?.classList.remove('on','deck-mode','deck-revealed');
  $('#deckctrl')?.classList.remove('on');
  preview=deckVisibleCard();deckPreviewReveal=false;
  z.classList.add('on');
  renderDeckOverlay();
  if(!deckVisibleFaceUp()){
    deckOpenPending=false;
    return;
  }
  const current=preview;
  load(current).then(()=>{
    if(preview===current&&z.classList.contains('on'))renderDeckOverlay();
  }).catch(err=>console.error('Deck preview load failed',err)).finally(()=>{
    deckOpenPending=false;
  });
}`;
source=source.slice(0,openStart)+opener+source.slice(openEnd);

replaceOnce(
  'deck tap gesture routing',
  "if(!moved){if(from==='deck'){openDeckOptions();return}openCard(c,true);return}",
  "if(!moved){if(from==='deck'){handleDeckTap();return}openCard(c,true);return}"
);

replaceOnce(
  'deck close clears gesture state',
  'preview=null;deckPreviewReveal=false;deckActionBusy=false;',
  'preview=null;deckPreviewReveal=false;deckActionBusy=false;deckOpenPending=false;clearTimeout(deckTapTimer);deckTapTimer=null;deckTapAt=0;'
);

fs.writeFileSync(path,source);
console.log('Applied H51 safe deck-open gesture patch');
