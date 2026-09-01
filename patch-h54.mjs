import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

const start=source.indexOf('function scryCard(id){');
const end=source.indexOf('\nfunction renderScryHand(){',start);
if(start<0||end<0) throw new Error('H54 patch failed: scryCard block not found');

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
  const cleanup=()=>{clearLong();ghost?.remove();ghost=null;selected=false;card.classList.remove('selected');press=null};

  function beginSelected(e){
    if(!press||selected)return;
    selected=true;
    card.classList.add('selected');
    ghost=makeGhost(c,false);
    ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
    try{card.setPointerCapture?.(e.pointerId)}catch{}
  }

  card.onpointerdown=e=>{
    if(e.button!==undefined&&e.button!==0)return;
    e.preventDefault();
    press={x:e.clientX,y:e.clientY,pid:e.pointerId,moved:false};
    selected=false;
    clearLong();
    longTimer=setTimeout(()=>beginSelected(e),500);
  };

  card.onpointermove=e=>{
    if(!press)return;
    const dist=Math.hypot(e.clientX-press.x,e.clientY-press.y);
    if(!selected){
      if(dist>10){press.moved=true;clearLong()}
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
  };

  card.onpointerup=async e=>{
    if(!press)return;
    clearLong();
    const wasSelected=selected,wasMoved=press.moved;
    const pid=press.pid;
    press=null;

    if(wasSelected){
      try{card.releasePointerCapture?.(pid)}catch{}
      ghost?.remove();ghost=null;
      card.classList.remove('selected');selected=false;

      if(handHit(e.clientX,e.clientY)){
        await moveToHandAt(id,e.clientX);
        return;
      }

      const fr=fieldRect();
      if(pointInRect(e.clientX,e.clientY,fr)){
        placeOnField(id,e.clientX,e.clientY,false);
        render();
        return;
      }

      const row=$('#scryrow'),rr=row?.getBoundingClientRect();
      if(rr&&pointInRect(e.clientX,e.clientY,rr)){
        const from=st.scry.indexOf(id);
        const to=Math.max(0,Math.min(st.scry.length-1,scryIndexAt(e.clientX)));
        if(from>=0&&to>=0&&from!==to){st.scry.splice(from,1);st.scry.splice(to,0,id)}
      }
      renderScryHand();
      return;
    }

    if(wasMoved)return;
    openBoardZoom(c);
  };

  card.onpointercancel=()=>{cleanup();renderScryHand()};
  card.oncontextmenu=e=>e.preventDefault();
  return item;
}`;

source=source.slice(0,start)+replacement+source.slice(end);
fs.writeFileSync(path,source);
console.log('Applied H54 hand-like scry drag/drop patch');
