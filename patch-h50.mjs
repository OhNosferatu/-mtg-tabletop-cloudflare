import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceBlock(label,startToken,endToken,replacement){
  const start=source.indexOf(startToken);
  const end=source.indexOf(endToken,start);
  if(start<0||end<0)throw new Error(`H50 patch failed: ${label}`);
  source=source.slice(0,start)+replacement+source.slice(end);
}

// Replace the old inspect-based deck opener with a dedicated lightweight deck overlay.
replaceBlock(
  'deck overlay helpers',
  'async function openDeckOptions(){',
  'function syncDeckFaces()',
  `let deckActionBusy=false;
function ensureDeckOverlay(){
  let z=$('#deckoverlay');
  if(z)return z;
  const style=document.createElement('style');
  style.textContent='#deckoverlay{display:none;position:fixed;inset:0;z-index:31000;background:rgba(5,5,5,.62);padding:max(66px,env(safe-area-inset-top)) 12px max(206px,env(safe-area-inset-bottom));align-items:center;justify-content:center;touch-action:manipulation}#deckoverlay.on{display:flex}#deckoverlayclose{position:fixed;right:14px;top:max(14px,env(safe-area-inset-top));z-index:31004;width:48px;height:48px;border:1px solid #8b7659;border-radius:50%;background:#211b17;color:#fff;font:800 30px/1 system-ui;display:grid;place-items:center;padding:0;touch-action:manipulation}#deckoverlaypreview{display:flex;align-items:center;justify-content:center;min-height:0;width:100%;height:100%;padding-bottom:170px;pointer-events:none}#deckoverlaypreview img{display:block;max-width:min(58vw,280px);max-height:calc(100dvh - 330px);width:auto;height:auto;object-fit:contain;border-radius:11px;box-shadow:0 10px 28px #0009}#deckoverlaypreview[hidden]{display:none!important}#deckoverlaybottom{position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:31003}#deckoverlaystatus{height:38px;display:grid;place-items:center;margin-bottom:7px;border:1px solid #806a50;border-radius:9px;background:rgba(24,19,15,.93);color:#f0dcb7;font:900 10px/1 ui-monospace,Menlo,monospace}#deckoverlaycontrols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:7px;border:1px solid #5d4b39;border-radius:12px;background:rgba(24,19,15,.94);box-shadow:0 -8px 24px #0008}#deckoverlaycontrols button{min-height:43px;border:1px solid #806a50;border-radius:8px;background:#2b231c;color:#f5ead8;font:800 9px/1.1 ui-monospace,Menlo,monospace;padding:6px 4px;touch-action:manipulation}#deckoverlaycontrols button:disabled{opacity:.48}@media(max-width:390px){#deckoverlay{padding-bottom:max(202px,env(safe-area-inset-bottom))}#deckoverlaypreview{padding-bottom:166px}#deckoverlaypreview img{max-width:min(55vw,250px);max-height:calc(100dvh - 325px)}#deckoverlaycontrols{gap:5px}#deckoverlaycontrols button{min-height:41px;font-size:8px}}';
  document.head.appendChild(style);
  z=document.createElement('div');
  z.id='deckoverlay';
  z.innerHTML='<button id="deckoverlayclose" aria-label="Close deck">×</button><div id="deckoverlaypreview" hidden><img alt="Visible deck card" decoding="async"></div><div id="deckoverlaybottom"><div id="deckoverlaystatus"></div><div id="deckoverlaycontrols"><button data-deck-action="draw">Draw</button><button data-deck-action="mill">Mill 1</button><button data-deck-action="scry">Scry 1</button><button data-deck-action="reveal">Reveal Top</button><button data-deck-action="topbottom">Top → Bottom</button><button data-deck-action="bottomtop">Bottom → Top</button><button data-deck-action="shuffle">Shuffle</button><button data-deck-action="cut">Cut Deck</button><button data-deck-action="flipdeck">Flip Deck</button></div></div>';
  document.body.appendChild(z);
  z.addEventListener('click',async e=>{
    if(e.target===z||e.target.closest?.('#deckoverlayclose')){e.preventDefault();closeDeckOverlay();return}
    const b=e.target.closest?.('button[data-deck-action]');
    if(!b||deckActionBusy)return;
    e.preventDefault();e.stopPropagation();
    deckActionBusy=true;
    z.querySelectorAll('button[data-deck-action]').forEach(x=>x.disabled=true);
    try{await deckAction(b.dataset.deckAction)}catch(err){console.error('Deck action failed',err)}finally{
      deckActionBusy=false;
      if(z.classList.contains('on')){
        z.querySelectorAll('button[data-deck-action]').forEach(x=>x.disabled=false);
        renderDeckOverlay();
      }
    }
  });
  return z;
}
function renderDeckOverlay(){
  const z=$('#deckoverlay');if(!z||!z.classList.contains('on'))return;
  const c=deckVisibleCard(),status=z.querySelector('#deckoverlaystatus'),wrap=z.querySelector('#deckoverlaypreview'),img=wrap?.querySelector('img');
  const state=st.deckFlipped?'FLIPPED · FACE UP':deckVisibleFaceUp()?'TOP FACE UP':'FACE DOWN';
  if(status)status.textContent=st.deck.length+' cards · '+state;
  const show=!!c&&(deckPreviewReveal||deckVisibleFaceUp());
  if(wrap)wrap.hidden=!show;
  if(!show){img?.removeAttribute('src');return}
  const src=frontImage(c)||'';
  if(src&&img&&img.getAttribute('src')!==src)img.src=src;
}
async function openDeckOptions(){
  if(!st.deck.length)return;
  $('#inspect')?.classList.remove('on','deck-mode','deck-revealed');
  $('#deckctrl')?.classList.remove('on');
  preview=deckVisibleCard();deckPreviewReveal=false;
  const z=ensureDeckOverlay();z.classList.add('on');renderDeckOverlay();
  if(deckVisibleFaceUp()){
    const current=preview;await load(current);
    if(preview===current&&z.classList.contains('on'))renderDeckOverlay();
  }
}
`
);

// Do not revive the legacy deck-control panel during normal renders.
replaceBlock(
  'legacy deck panel updater',
  'function updateDeckPanel(){',
  'async function showDeckTop',
  `function updateDeckPanel(){
  const old=$('#deckctrl');if(old)old.classList.remove('on');
  if($('#deckoverlay')?.classList.contains('on'))renderDeckOverlay();
}
`
);

// Replace the inspect-specific close/refresh/action path with the lightweight overlay path.
replaceBlock(
  'deck state actions',
  'function closeDeckOverlay(){',
  "$('#closeinspect')?.addEventListener",
  `function closeDeckOverlay(){
  preview=null;deckPreviewReveal=false;deckActionBusy=false;
  const z=$('#deckoverlay');if(z){z.classList.remove('on');z.querySelector('#deckoverlaypreview')?.setAttribute('hidden','');z.querySelector('#deckoverlaypreview img')?.removeAttribute('src');z.querySelectorAll('button[data-deck-action]').forEach(x=>x.disabled=false)}
  const inspect=$('#inspect');if(inspect)inspect.classList.remove('on','deck-mode','deck-revealed');
  $('#deckctrl')?.classList.remove('on');$('#ctrl')?.classList.remove('on');$('#pimg')?.removeAttribute('src');
}

async function refreshDeckAfterMutation(reveal=false){
  if(!st.deck.length){closeDeckOverlay();render();return}
  preview=deckVisibleCard();deckPreviewReveal=!!reveal;
  render();renderDeckOverlay();syncDeckPileVisual();
  const shouldReveal=deckPreviewReveal||deckVisibleFaceUp();
  if(!shouldReveal)return;
  const current=preview;await load(current);
  if(preview===current){renderDeckOverlay();syncDeckPileVisual()}
}

async function deckAction(action){
  if(!st.deck.length){closeDeckOverlay();render();return}
  deckPreviewReveal=false;

  if(action==='draw'){
    const id=st.deck.shift(),c=st.cards[id];
    c.zone='hand';c.faceDown=false;c.tap=false;st.hand.push(id);
    closeDeckOverlay();render();
    load(c).then(()=>{if(c.zone==='hand')render()});
    return;
  }

  if(action==='mill'){
    const id=st.deck.shift(),c=st.cards[id];
    c.zone='discard';c.faceDown=false;c.tap=false;st.discard.unshift(id);
    render();await refreshDeckAfterMutation(false);
    load(c).then(()=>{if(c.zone==='discard'){render();renderDeckOverlay()}});
    return;
  }

  if(action==='scry'){
    await scryOne();
    return;
  }

  if(action==='reveal'){
    await refreshDeckAfterMutation(true);
    return;
  }

  if(action==='topbottom'){
    if(st.deck.length>1)st.deck.push(st.deck.shift());
    syncDeckFaces();await refreshDeckAfterMutation(st.deckFlipped);return;
  }
  if(action==='bottomtop'){
    if(st.deck.length>1)st.deck.unshift(st.deck.pop());
    syncDeckFaces();await refreshDeckAfterMutation(st.deckFlipped);return;
  }
  if(action==='shuffle'){
    shuffle(st.deck);syncDeckFaces();await refreshDeckAfterMutation(st.deckFlipped);return;
  }
  if(action==='cut'){
    if(st.deck.length>1){const cut=1+Math.floor(Math.random()*(st.deck.length-1));st.deck=[...st.deck.slice(cut),...st.deck.slice(0,cut)];syncDeckFaces()}
    await refreshDeckAfterMutation(st.deckFlipped);return;
  }
  if(action==='flipdeck'){
    st.deck.reverse();st.deckFlipped=!st.deckFlipped;syncDeckFaces();await refreshDeckAfterMutation(st.deckFlipped);
  }
}

`
);

// Every Scry 1 press should add one more card to the private Scry Hand.
replaceBlock(
  'multiple-card scry',
  'async function scryOne(){',
  '\n\nfunction renderPile',
  `async function scryOne(){
  if(!st.deck.length){closeDeckOverlay();render();return}
  const id=st.deck.shift(),c=st.cards[id];
  c.zone='scry';c.faceDown=false;c.tap=false;st.scry.push(id);
  closeDeckOverlay();render();renderScryHand();
  load(c).then(()=>{if(c.zone==='scry')renderScryHand()});
}
`
);

fs.writeFileSync(path,source);
console.log('Applied H50 lightweight deck overlay, serialized controls, and multi-card scry patch');
