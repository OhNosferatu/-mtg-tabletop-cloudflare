import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

const start=source.indexOf('async function deckAction(action){');
const end=source.indexOf('\nfunction openCard',start);
if(start<0||end<0) throw new Error('H47 patch failed: deckAction block not found');

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
  preview=st.cards[st.deck[0]];
  deckPreviewReveal=!!reveal;
  render();
  updateDeckPanel();
  const shouldReveal=deckPreviewReveal||st.deckFlipped;
  if(!shouldReveal){if(deckIsPreview())$('#pimg').src=BACK;return}
  const current=preview;
  await load(current);
  if(preview===current&&deckIsPreview()&&$('#inspect')?.classList.contains('on'))$('#pimg').src=frontImage(current)||BACK;
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
console.log('Applied H47 deck mechanics and close patch to public/app.js');
