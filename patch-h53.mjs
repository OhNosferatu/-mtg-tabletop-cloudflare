import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceBlock(label,startToken,endToken,replacement){
  const start=source.indexOf(startToken);
  const end=source.indexOf(endToken,start);
  if(start<0||end<0) throw new Error(`H53 patch failed: ${label}`);
  source=source.slice(0,start)+replacement+source.slice(end);
}

// Strip deck opening down to an isolated control overlay. Do not touch #inspect,
// #pimg, old deckctrl, card-preview loading, or the normal render cycle when opening.
replaceBlock(
  'minimal deck overlay helpers',
  'function ensureDeckOverlay(){',
  'function syncDeckFaces()',
  `function ensureDeckOverlay(){
  let z=$('#deckoverlay');
  if(z)return z;
  const style=document.createElement('style');
  style.textContent='#deckoverlay{display:none;position:fixed;inset:0;z-index:31000;background:rgba(5,5,5,.62);touch-action:manipulation}#deckoverlay.on{display:block}#deckoverlayclose{position:absolute;right:14px;top:max(14px,env(safe-area-inset-top));width:48px;height:48px;border:1px solid #8b7659;border-radius:50%;background:#211b17;color:#fff;font:800 30px/1 system-ui;display:grid;place-items:center;padding:0;touch-action:manipulation}#deckoverlaypanel{position:absolute;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));padding:8px;border:1px solid #5d4b39;border-radius:12px;background:rgba(24,19,15,.94);box-shadow:0 -8px 24px #0008}#deckoverlaystatus{min-height:36px;display:grid;place-items:center;margin-bottom:7px;color:#f0dcb7;font:900 10px/1 ui-monospace,Menlo,monospace}#deckoverlaycontrols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}#deckoverlaycontrols button{min-height:43px;border:1px solid #806a50;border-radius:8px;background:#2b231c;color:#f5ead8;font:800 9px/1.1 ui-monospace,Menlo,monospace;padding:6px 4px;touch-action:manipulation}#deckoverlaycontrols button:disabled{opacity:.48}';
  document.head.appendChild(style);
  z=document.createElement('div');
  z.id='deckoverlay';
  z.innerHTML='<button id="deckoverlayclose" aria-label="Close deck">×</button><div id="deckoverlaypanel"><div id="deckoverlaystatus"></div><div id="deckoverlaycontrols"><button data-deck-action="draw">Draw</button><button data-deck-action="mill">Mill 1</button><button data-deck-action="scry">Scry 1</button><button data-deck-action="reveal">Reveal Top</button><button data-deck-action="topbottom">Top → Bottom</button><button data-deck-action="bottomtop">Bottom → Top</button><button data-deck-action="shuffle">Shuffle</button><button data-deck-action="cut">Cut Deck</button><button data-deck-action="flipdeck">Flip Deck</button></div></div>';
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
  const status=z.querySelector('#deckoverlaystatus');
  const state=st.deckFlipped?'FLIPPED · FACE UP':deckVisibleFaceUp()?'TOP FACE UP':'FACE DOWN';
  if(status)status.textContent=st.deck.length+' cards · '+state;
}
function openDeckOptions(){
  if(!st.deck.length)return;
  const z=ensureDeckOverlay();
  preview=deckVisibleCard();deckPreviewReveal=false;deckOpenPending=false;
  z.classList.add('on');
  renderDeckOverlay();
}
`
);

replaceBlock(
  'legacy deck panel updater',
  'function updateDeckPanel(){',
  'async function showDeckTop',
  `function updateDeckPanel(){
  const old=$('#deckctrl');if(old)old.classList.remove('on');
}
`
);

replaceBlock(
  'isolated deck close',
  'function closeDeckOverlay(){',
  'async function refreshDeckAfterMutation',
  `function closeDeckOverlay(){
  preview=null;deckPreviewReveal=false;deckActionBusy=false;deckOpenPending=false;
  clearTimeout(deckTapTimer);deckTapTimer=null;deckTapAt=0;
  const z=$('#deckoverlay');
  if(z){z.classList.remove('on');z.querySelectorAll('button[data-deck-action]').forEach(x=>x.disabled=false)}
}

`
);

replaceBlock(
  'nonblocking deck refresh',
  'async function refreshDeckAfterMutation',
  'async function deckAction(action){',
  `async function refreshDeckAfterMutation(reveal=false){
  if(!st.deck.length){closeDeckOverlay();render();return}
  preview=deckVisibleCard();deckPreviewReveal=!!reveal;
  render();
  syncDeckPileVisual();
  renderDeckOverlay();
}

`
);

fs.writeFileSync(path,source);
console.log('Applied H53 isolated deck menu patch');
