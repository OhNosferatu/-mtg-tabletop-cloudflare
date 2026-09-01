import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H58 patch failed: ${label}`);
  source=source.replace(from,to);
}

replaceOnce(
  'Scry tray base height',
  '#scrytray{position:fixed;z-index:44;height:196px;max-height:min(196px,31dvh);background:rgba(27,23,20,.97);border:1px solid #806a50;border-radius:12px;padding:7px 8px 8px;box-shadow:0 -10px 24px #0008;overflow:hidden}',
  '#scrytray{position:fixed;z-index:44;height:218px;max-height:min(218px,35dvh);background:rgba(27,23,20,.97);border:1px solid #806a50;border-radius:12px;padding:7px 8px 11px;box-shadow:0 -10px 24px #0008;overflow:hidden}'
);

replaceOnce(
  'Scry tray mobile height',
  '@media(max-width:390px){#scrytray{height:190px;max-height:min(190px,31dvh);padding-left:7px;padding-right:7px}.scry-item,.scry-card{width:82px}.scry-item{flex-basis:82px}#hand.hand.scry-visible{height:184px!important}',
  '@media(max-width:390px){#scrytray{height:212px;max-height:min(212px,35dvh);padding:7px 7px 11px}.scry-item,.scry-card{width:82px}.scry-item{flex-basis:82px}#hand.hand.scry-visible{height:184px!important}'
);

const start=source.indexOf('function scryCard(id){');
const end=source.indexOf('\nfunction renderScryHand(){',start);
if(start<0||end<0)throw new Error('H58 patch failed: scryCard block not found');

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
  const finishVisual=()=>{
    clearLong();
    ghost?.remove();ghost=null;
    selected=false;
    card.classList.remove('selected');
  };

  function beginSelected(){
    if(!press||selected)return;
    selected=true;
    card.classList.add('selected');
    ghost=makeGhost(c,false);
    ghost.style.left=press.lastX+'px';
    ghost.style.top=press.lastY+'px';
  }

  function documentMove(e){
    if(!press||e.pointerId!==press.pid)return;
    press.lastX=e.clientX;press.lastY=e.clientY;
    const dist=Math.hypot(e.clientX-press.x,e.clientY-press.y);
    if(!selected){
      if(dist>12){press.moved=true;clearLong()}
      return;
    }
    e.preventDefault();
    if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px'}
    const row=$('#scryrow');
    if(row){
      const rr=row.getBoundingClientRect();
      if(e.clientX<rr.left+30)row.scrollLeft-=10;
      else if(e.clientX>rr.right-30)row.scrollLeft+=10;
    }
  }

  async function documentUp(e){
    if(!press||e.pointerId!==press.pid)return;
    const wasSelected=selected,wasMoved=press.moved;
    const x=e.clientX,y=e.clientY,pid=press.pid;
    removeDocumentDrag();
    try{card.releasePointerCapture?.(pid)}catch{}
    finishVisual();
    press=null;

    if(wasSelected){
      e.preventDefault();e.stopPropagation();
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
      return;
    }

    if(!wasMoved)openBoardZoom(c);
  }

  function documentCancel(e){
    if(!press||e.pointerId!==press.pid)return;
    const pid=press.pid;
    removeDocumentDrag();
    try{card.releasePointerCapture?.(pid)}catch{}
    finishVisual();
    press=null;
    renderScryHand();
  }

  card.onpointerdown=e=>{
    if(e.button!==undefined&&e.button!==0)return;
    e.preventDefault();
    removeDocumentDrag();
    press={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,pid:e.pointerId,moved:false};
    selected=false;
    try{card.setPointerCapture?.(e.pointerId)}catch{}
    document.addEventListener('pointermove',documentMove,true);
    document.addEventListener('pointerup',documentUp,true);
    document.addEventListener('pointercancel',documentCancel,true);
    clearLong();
    longTimer=setTimeout(beginSelected,500);
  };

  card.oncontextmenu=e=>e.preventDefault();
  return item;
}`;

source=source.slice(0,start)+replacement+source.slice(end);
fs.writeFileSync(path,source);
console.log('Applied H58 reliable Scry drag and unclipped arrow controls patch');
