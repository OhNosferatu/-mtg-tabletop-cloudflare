import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from)) throw new Error(`H48 patch failed: ${label} target was not found`);
  source=source.replace(from,to);
}

replaceOnce(
  'deck visible-state helpers',
  "function deckIsPreview(){return !!preview&&preview.zone==='deck'&&st.deck[0]===preview.id}",
  "function deckIsPreview(){return !!preview&&preview.zone==='deck'&&st.deck[0]===preview.id}function deckVisibleCard(){return st.deck.length?st.cards[st.deck[0]]:null}function deckVisibleFaceUp(){const c=deckVisibleCard();return !!c&&(st.deckFlipped||!c.faceDown)}function syncDeckPileVisual(){const el=$('#deck'),c=deckVisibleCard();if(!el||!c)return;const img=el.querySelector('img');if(img)img.src=deckVisibleFaceUp()?(frontImage(c)||BACK):BACK}async function openDeckOptions(){if(!st.deck.length)return;preview=deckVisibleCard();deckPreviewReveal=false;$('#ctrl')?.classList.remove('on');$('#inspect')?.classList.add('on');if(deckVisibleFaceUp()){await load(preview);if(deckIsPreview())$('#pimg').src=frontImage(preview)||BACK}else $('#pimg').src=BACK;updateDeckPanel();syncDeckPileVisual()}"
);

replaceOnce(
  'deck panel visible state',
  "function updateDeckPanel(){installDeckPanel();const p=$('#deckctrl');const on=deckIsPreview();p.classList.toggle('on',on);if(on){$('#deckstatus').textContent=`${st.deck.length} cards · ${st.deckFlipped?'FACE UP':'FACE DOWN'}`}}",
  "function updateDeckPanel(){installDeckPanel();const p=$('#deckctrl');const on=deckIsPreview();p.classList.toggle('on',on);if(on){const state=st.deckFlipped?'FLIPPED · FACE UP':deckVisibleFaceUp()?'TOP FACE UP':'FACE DOWN';$('#deckstatus').textContent=`${st.deck.length} cards · ${state}`}}"
);

replaceOnce(
  'show deck top from visible face',
  "async function showDeckTop(reveal=deckPreviewReveal){if(!st.deck.length){preview=null;$('#inspect').classList.remove('on');$('#deckctrl')?.classList.remove('on');render();return}preview=st.cards[st.deck[0]];if(reveal||st.deckFlipped){await load(preview);$('#pimg').src=frontImage(preview)||BACK}else $('#pimg').src=BACK;updateDeckPanel();render()}",
  "async function showDeckTop(reveal=deckPreviewReveal){if(!st.deck.length){preview=null;$('#inspect').classList.remove('on');$('#deckctrl')?.classList.remove('on');render();return}preview=deckVisibleCard();if(reveal||deckVisibleFaceUp()){await load(preview);$('#pimg').src=frontImage(preview)||BACK}else $('#pimg').src=BACK;updateDeckPanel();render();syncDeckPileVisual()}"
);

replaceOnce(
  'deck tap opens options',
  "if(!moved){openCard(c,true);return}",
  "if(!moved){if(from==='deck'){openDeckOptions();return}openCard(c,true);return}"
);

replaceOnce(
  'deck pile visible card',
  "if(back){const img=document.createElement('img');img.src=st.deckFlipped&&el.id==='deck'?frontImage(c)||BACK:BACK;img.draggable=false;el.appendChild(img)}",
  "if(back){const img=document.createElement('img');img.src=el.id==='deck'&&deckVisibleFaceUp()?frontImage(c)||BACK:BACK;img.draggable=false;el.appendChild(img)}"
);

replaceOnce(
  'deck pile non-drag click',
  "else el.onclick=()=>c?openCard(c,true):null",
  "else el.onclick=()=>c?(el.id==='deck'?openDeckOptions():openCard(c,true)):null"
);

const start=source.indexOf('async function deckAction(action){');
const end=source.indexOf('\nfunction openCard',start);
if(start<0||end<0) throw new Error('H48 patch failed: deckAction block not found');

const replacement=`function closeDeckOverlay(){
  preview=null;
  deckPreviewReveal=false;
  const inspect=$('#inspect');
  if(inspect)inspect.classList.remove('on','deck-mode','deck-revealed');
  $('#deckctrl')?.classList.remove('on');
  $('#ctrl')?.classList.remove('on');
  $('#pimg')?.removeAttribute('src');
}

async function refreshDeckAfterMutation(reveal=false){
  if(!st.deck.length){closeDeckOverlay();render();return}
  preview=deckVisibleCard();
  deckPreviewReveal=!!reveal;
  render();
  updateDeckPanel();
  const shouldReveal=deckPreviewReveal||deckVisibleFaceUp();
  if(!shouldReveal){if(deckIsPreview())$('#pimg').src=BACK;syncDeckPileVisual();return}
  const current=preview;
  await load(current);
  if(preview===current&&deckIsPreview()&&$('#inspect')?.classList.contains('on'))$('#pimg').src=frontImage(current)||BACK;
  syncDeckPileVisual();
  updateDeckPanel();
}

async function deckAction(action){
  if(!st.deck.length){closeDeckOverlay();render();return}
  deckPreviewReveal=false;

  if(action==='draw'){
    const id=st.deck.shift(),c=st.cards[id];
    c.zone='hand';c.faceDown=false;c.tap=false;st.hand.push(id);
    closeDeckOverlay();
    render();
    load(c);
    return;
  }

  if(action==='mill'){
    const id=st.deck.shift(),c=st.cards[id];
    c.zone='discard';c.faceDown=false;c.tap=false;st.discard.unshift(id);
    load(c);
    await refreshDeckAfterMutation(false);
    return;
  }

  if(action==='scry'||action==='reveal'){
    await refreshDeckAfterMutation(true);
    return;
  }

  if(action==='topbottom'){
    if(st.deck.length>1)st.deck.push(st.deck.shift());
    syncDeckFaces();
    await refreshDeckAfterMutation(st.deckFlipped);
    return;
  }

  if(action==='bottomtop'){
    if(st.deck.length>1)st.deck.unshift(st.deck.pop());
    syncDeckFaces();
    await refreshDeckAfterMutation(st.deckFlipped);
    return;
  }

  if(action==='shuffle'){
    shuffle(st.deck);
    syncDeckFaces();
    await refreshDeckAfterMutation(st.deckFlipped);
    return;
  }

  if(action==='cut'){
    if(st.deck.length>1){
      const cut=1+Math.floor(Math.random()*(st.deck.length-1));
      st.deck=[...st.deck.slice(cut),...st.deck.slice(0,cut)];
      syncDeckFaces();
    }
    await refreshDeckAfterMutation(st.deckFlipped);
    return;
  }

  if(action==='flipdeck'){
    st.deck.reverse();
    st.deckFlipped=!st.deckFlipped;
    syncDeckFaces();
    await refreshDeckAfterMutation(st.deckFlipped);
  }
}

$('#closeinspect')?.addEventListener('click',e=>{
  const deckOpen=$('#inspect')?.classList.contains('deck-mode')||$('#deckctrl')?.classList.contains('on');
  if(!deckOpen)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  closeDeckOverlay();
},true);

$('#inspect')?.addEventListener('click',e=>{
  if(e.target===$('#inspect')&&($('#inspect')?.classList.contains('deck-mode')||$('#deckctrl')?.classList.contains('on')))closeDeckOverlay();
});`;

source=source.slice(0,start)+replacement+source.slice(end);
fs.writeFileSync(path,source);
console.log('Applied H48 deck-pile options, visible-card preview, and deck mechanics patch to public/app.js');
