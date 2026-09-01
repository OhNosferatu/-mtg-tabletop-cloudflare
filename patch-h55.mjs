import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H55 patch failed: ${label}`);
  source=source.replace(from,to);
}

replaceOnce(
  'preserve face when dropped on deck',
  "async function moveAndMaybeLoad(id,zone,atTop=false){const c=st.cards[id];putInZone(id,zone,atTop);const shouldLoad=revealForZone(c,zone);if(shouldLoad&&!c.img)await load(c);render()}",
  "async function moveAndMaybeLoad(id,zone,atTop=false){const c=st.cards[id];if(!c)return;const wasFaceDown=!!c.faceDown;putInZone(id,zone,atTop);let shouldLoad;if(zone==='deck'){c.faceDown=wasFaceDown;shouldLoad=!c.faceDown}else shouldLoad=revealForZone(c,zone);if(shouldLoad&&!c.img)await load(c);render()}"
);

const start=source.indexOf('function scryCard(id){');
const end=source.indexOf('\nfunction renderScryHand(){',start);
if(start<0||end<0)throw new Error('H55 patch failed: scryCard block not found');

const replacement=`function scryCard(id){
  const c=st.cards[id],item=document.createElement('div');item.className='scry-item';
  const card=document.createElement('div');card.className='scry-card';card.dataset.id=id;card.innerHTML=face(c);
  const arrows=document.createElement('div');arrows.className='scry-arrows';
  arrows.innerHTML='<button data-scry-return="top" aria-label="Return to top">↑<small>TOP</small></button><button data-scry-return="bottom" aria-label="Put on bottom">↓<small>BOTTOM</small></button>';
  item.append(card,arrows);

  arrows.addEventListener('pointerdown',e=>e.stopPropagation());
  arrows.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    const b=e.target.closest('button[data-scry-return]');
    if(b)returnScryToDeck(id,b.dataset.scryReturn==='top');
  });

  let press=null,longTimer=null,selected=false,ghost=null;
  const clearLong=()=>{clearTimeout(longTimer);longTimer=null};
  const removeDocumentDrag=()=>{
    document.removeEventListener('pointermove',documentMove,true);
    document.removeEventListener('pointerup',documentUp,true);
    document.removeEventListener('pointercancel',documentCancel,true);
  };
  const finishVisual=()=>{clearLong();ghost?.remove();ghost=null;selected=false;card.classList.remove('selected')};

  function beginSelected(){
    if(!press||selected)return;
    selected=true;
    card.classList.add('selected');
    ghost=makeGhost(c,false);
    ghost.style.left=press.lastX+'px';ghost.style.top=press.lastY+'px';
    document.addEventListener('pointermove',documentMove,true);
    document.addEventListener('pointerup',documentUp,true);
    document.addEventListener('pointercancel',documentCancel,true);
  }

  function documentMove(e){
    if(!press||!selected||e.pointerId!==press.pid)return;
    e.preventDefault();
    press.lastX=e.clientX;press.lastY=e.clientY;
    if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px'}
    const row=$('#scryrow');
    if(row){
      const rr=row.getBoundingClientRect();
      if(e.clientX<rr.left+30)row.scrollLeft-=10;
      else if(e.clientX>rr.right-30)row.scrollLeft+=10;
    }
  }

  async function documentUp(e){
    if(!press||!selected||e.pointerId!==press.pid)return;
    e.preventDefault();e.stopPropagation();
    const x=e.clientX,y=e.clientY;
    removeDocumentDrag();finishVisual();press=null;

    if(handHit(x,y)){
      await moveToHandAt(id,x);
      return;
    }

    const fr=fieldRect();
    if(pointInRect(x,y,fr)){
      placeOnField(id,x,y,false);
      render();
      return;
    }

    const row=$('#scryrow'),rr=row?.getBoundingClientRect();
    if(rr&&pointInRect(x,y,rr)){
      const from=st.scry.indexOf(id);
      const to=Math.max(0,Math.min(st.scry.length-1,scryIndexAt(x)));
      if(from>=0&&to>=0&&from!==to){st.scry.splice(from,1);st.scry.splice(to,0,id)}
    }
    renderScryHand();
  }

  function documentCancel(e){
    if(!press||e.pointerId!==press.pid)return;
    removeDocumentDrag();finishVisual();press=null;renderScryHand();
  }

  card.onpointerdown=e=>{
    if(e.button!==undefined&&e.button!==0)return;
    e.preventDefault();
    press={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,pid:e.pointerId,moved:false};
    selected=false;clearLong();
    longTimer=setTimeout(beginSelected,500);
  };

  card.onpointermove=e=>{
    if(!press||selected||e.pointerId!==press.pid)return;
    press.lastX=e.clientX;press.lastY=e.clientY;
    if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>10){press.moved=true;clearLong()}
  };

  card.onpointerup=e=>{
    if(!press||selected||e.pointerId!==press.pid)return;
    clearLong();
    const moved=press.moved;press=null;
    if(!moved)openBoardZoom(c);
  };

  card.onpointercancel=e=>{
    if(selected)documentCancel(e);
    else{clearLong();press=null}
  };
  card.oncontextmenu=e=>e.preventDefault();
  return item;
}`;

source=source.slice(0,start)+replacement+source.slice(end);
fs.writeFileSync(path,source);
console.log('Applied H55 face-preserving deck drop and document-level Scry drag patch');
