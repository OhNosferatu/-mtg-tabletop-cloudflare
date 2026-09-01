import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from)) throw new Error(`H49 patch failed: ${label} target was not found`);
  source=source.replace(from,to);
}

replaceOnce(
  'scry state',
  "deck:[],hand:[],cmd:[]",
  "deck:[],hand:[],scry:[],cmd:[]"
);

replaceOnce(
  'remove from scry state',
  "['deck','hand','cmd','side','tokens','discard','exile','field']",
  "['deck','hand','scry','cmd','side','tokens','discard','exile','field']"
);

replaceOnce(
  'reset scry on deck import',
  "st.field=[];st.hand=[];st.discard=[];st.exile=[];st.deckFlipped=false;",
  "st.field=[];st.hand=[];st.scry=[];st.discard=[];st.exile=[];st.deckFlipped=false;"
);

const scryUi=`
function ensureScryTray(){
  let tray=$('#scrytray');
  if(tray)return tray;
  const style=document.createElement('style');
  style.textContent='#scrytray{position:fixed;left:8px;right:8px;z-index:46;background:rgba(27,23,20,.96);border:1px solid #806a50;border-radius:12px;padding:7px;box-shadow:0 -10px 24px #0008;max-height:178px;overflow:hidden}#scrytray[hidden]{display:none!important}.scry-head{display:flex;align-items:center;justify-content:space-between;height:25px;padding:0 3px 4px;font:900 9px/1 ui-monospace,Menlo,monospace;color:#f4eadb}.scry-private{font-size:7px;opacity:.62}.scry-row{display:flex;gap:7px;overflow-x:auto;overflow-y:hidden;padding:2px 2px 4px;scrollbar-width:none}.scry-row::-webkit-scrollbar{display:none}.scry-item{flex:0 0 88px;width:88px;display:flex;flex-direction:column;gap:4px}.scry-card{width:88px;aspect-ratio:.716;border-radius:7px;overflow:hidden;background:#111;box-shadow:0 5px 12px #0008;touch-action:none;position:relative}.scry-card img{width:100%;height:100%;object-fit:cover;pointer-events:none}.scry-card.selected{outline:3px solid #e6c456;outline-offset:1px}.scry-arrows{display:grid;grid-template-columns:1fr 1fr;gap:4px}.scry-arrows button{height:28px;border:1px solid #806a50;border-radius:7px;background:#2b231c;color:#f5ead8;font:900 17px/1 system-ui;padding:0;touch-action:manipulation}.scry-arrows button small{display:block;font:800 6px/1 ui-monospace,Menlo,monospace;margin-top:-2px}@media(max-width:390px){#scrytray{left:6px;right:6px}.scry-item,.scry-card{width:82px}.scry-item{flex-basis:82px}}';
  document.head.appendChild(style);
  tray=document.createElement('aside');
  tray.id='scrytray';
  tray.hidden=true;
  tray.innerHTML='<div class="scry-head"><span>Scry</span><span class="scry-private">PRIVATE</span></div><div class="scry-row" id="scryrow"></div>';
  document.body.appendChild(tray);
  const hand=$('#hand');
  if(hand)new MutationObserver(syncScryTrayPosition).observe(hand,{attributes:true,attributeFilter:['class','style']});
  window.addEventListener('resize',syncScryTrayPosition,{passive:true});
  return tray;
}
function syncScryTrayPosition(){
  const tray=$('#scrytray'),hand=$('#hand');
  if(!tray||!hand||tray.hidden)return;
  const r=hand.getBoundingClientRect();
  tray.style.bottom=Math.max(8,window.innerHeight-r.top+6)+'px';
}
function scryIndexAt(clientX){
  const row=$('#scryrow');if(!row)return st.scry.length;
  const cards=[...row.querySelectorAll('.scry-item')];
  for(let i=0;i<cards.length;i++){const r=cards[i].getBoundingClientRect();if(clientX<r.left+r.width/2)return i}
  return cards.length;
}
function returnScryToDeck(id,toTop){
  const c=st.cards[id];if(!c)return;
  removeFromAll(id);c.zone='deck';c.tap=false;c.faceDown=!st.deckFlipped;
  if(toTop)st.deck.unshift(id);else st.deck.push(id);
  syncDeckFaces();render();
}
function scryCard(id){
  const c=st.cards[id],item=document.createElement('div');item.className='scry-item';
  const card=document.createElement('div');card.className='scry-card';card.dataset.id=id;card.innerHTML=face(c);
  const arrows=document.createElement('div');arrows.className='scry-arrows';
  arrows.innerHTML='<button data-scry-return="top" aria-label="Return to top">↑<small>TOP</small></button><button data-scry-return="bottom" aria-label="Put on bottom">↓<small>BOTTOM</small></button>';
  item.append(card,arrows);
  arrows.addEventListener('pointerdown',e=>e.stopPropagation());
  arrows.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const b=e.target.closest('button[data-scry-return]');if(b)returnScryToDeck(id,b.dataset.scryReturn==='top')});
  let press=null,longTimer=null,selected=false,ghost=null;
  const cleanup=()=>{clearTimeout(longTimer);longTimer=null;ghost?.remove();ghost=null;selected=false;card.classList.remove('selected');press=null};
  card.onpointerdown=e=>{e.preventDefault();press={x:e.clientX,y:e.clientY,pid:e.pointerId,moved:false};selected=false;clearTimeout(longTimer);longTimer=setTimeout(()=>{if(!press)return;selected=true;card.classList.add('selected');ghost=makeGhost(c,false);ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';try{card.setPointerCapture?.(e.pointerId)}catch{}},500)};
  card.onpointermove=e=>{if(!press)return;const dist=Math.hypot(e.clientX-press.x,e.clientY-press.y);if(!selected&&dist>10){press.moved=true;clearTimeout(longTimer)}if(selected&&ghost){e.preventDefault();ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px'}};
  card.onpointerup=async e=>{if(!press)return;clearTimeout(longTimer);const wasSelected=selected,wasMoved=press.moved;press=null;if(wasSelected){try{card.releasePointerCapture?.(e.pointerId)}catch{}ghost?.remove();ghost=null;card.classList.remove('selected');selected=false;const row=$('#scryrow'),rr=row?.getBoundingClientRect();if(rr&&pointInRect(e.clientX,e.clientY,rr)){const from=st.scry.indexOf(id),to=Math.max(0,Math.min(st.scry.length-1,scryIndexAt(e.clientX)));if(from>=0&&to>=0&&from!==to){st.scry.splice(from,1);st.scry.splice(to,0,id)}renderScryHand();return}if(handHit(e.clientX,e.clientY)){await moveToHandAt(id,e.clientX);return}const fr=fieldRect();if(pointInRect(e.clientX,e.clientY,fr)){placeOnField(id,e.clientX,e.clientY,false);render();return}renderScryHand();return}if(wasMoved)return;openBoardZoom(c)};
  card.onpointercancel=()=>{cleanup();renderScryHand()};card.oncontextmenu=e=>e.preventDefault();
  return item;
}
function renderScryHand(){
  const tray=ensureScryTray(),row=$('#scryrow');
  const visible=st.scry.length>0&&st.view==='you';tray.hidden=!visible;
  if(!visible){if(row)row.innerHTML='';return}
  row.innerHTML='';st.scry.forEach(id=>row.appendChild(scryCard(id)));syncScryTrayPosition();
}
async function scryOne(){
  if(st.scry.length){closeDeckOverlay();renderScryHand();return}
  if(!st.deck.length){closeDeckOverlay();render();return}
  const id=st.deck.shift(),c=st.cards[id];
  c.zone='scry';c.faceDown=false;c.tap=false;st.scry.push(id);
  closeDeckOverlay();render();
  await load(c);renderScryHand();
}
`;

replaceOnce(
  'insert scry hand UI',
  "function renderPile(el,arr,label,{back=false,draggable=false,from=null,forceBack=false}={})",
  scryUi+"\nfunction renderPile(el,arr,label,{back=false,draggable=false,from=null,forceBack=false}={})"
);

replaceOnce(
  'render scry hand',
  "renderLife();updateDeckPanel()}",
  "renderLife();updateDeckPanel();renderScryHand()}"
);

replaceOnce(
  'hide private scry outside your side',
  "st.view=b.dataset.v;if(st.view==='opp')$('#hand').classList.remove('open')",
  "st.view=b.dataset.v;if(st.view==='opp')$('#hand').classList.remove('open');renderScryHand()"
);

replaceOnce(
  'mill physical card and refresh art',
  "c.zone='discard';c.faceDown=false;c.tap=false;st.discard.unshift(id);\n    load(c);\n    await refreshDeckAfterMutation(false);\n    return;",
  "c.zone='discard';c.faceDown=false;c.tap=false;st.discard.unshift(id);\n    const art=load(c);\n    await refreshDeckAfterMutation(false);\n    await art;\n    render();\n    return;"
);

replaceOnce(
  'scry uses private scry hand',
  "if(action==='scry'||action==='reveal'){\n    await refreshDeckAfterMutation(true);\n    return;\n  }",
  "if(action==='scry'){\n    await scryOne();\n    return;\n  }\n\n  if(action==='reveal'){\n    await refreshDeckAfterMutation(true);\n    return;\n  }"
);

fs.writeFileSync(path,source);
console.log('Applied H49 physical mill and private scry-hand patch to public/app.js');
