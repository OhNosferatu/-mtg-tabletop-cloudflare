import h116 from './worker-h116.js';

const BUILD='H117';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H117_FULL_BOARD_INTERACTION'))return source;
  let out=source;

  out=out.replace(
    "const st={cards:{},deck:[],hand:[],cmd:[],side:[],tokens:[],discard:[],exile:[],field:[],opp:[],view:'you',life:{you:40,opp:40},deckFlipped:false};",
    "const st={cards:{},deck:[],hand:[],cmd:[],side:[],tokens:[],discard:[],exile:[],field:[],opp:[],view:'you',life:{you:40,opp:40},deckFlipped:false,oppPublic:{cmd:[],deck:[],discard:[],exile:[],tokens:[],handCount:0,deckCount:0,deckFlipped:false}};"
  );

  const helpers=`
/* H117_FULL_BOARD_INTERACTION */
let h117ActiveBoardCard=null,h117ActiveBoardOwner='you',h117ZoomGuardInstalled=false;
function h117MarkOwners(){
  for(const id of st.opp){const c=st.cards[id];if(c){c.meta=c.meta||{};c.meta.h117Owner='opp'}}
  for(const id of st.field){const c=st.cards[id];if(c){c.meta=c.meta||{};if(!c.meta.h117Owner)c.meta.h117Owner='you'}}
}
function h117OwnerForCard(c){
  if(!c)return'you';
  if(c.meta?.h117Owner==='opp')return'opp';
  if(st.opp.includes(c.id))return'opp';
  const p=st.oppPublic||{};
  for(const z of['cmd','deck','discard','exile','tokens'])if(Array.isArray(p[z])&&p[z].includes(c.id))return'opp';
  return'you';
}
function h117HalfRect(owner){
  const content=$('#h105fullcontent');
  if(!content)return null;
  const r=content.getBoundingClientRect(),h=r.height/2;
  return{left:r.left,right:r.right,width:r.width,top:owner==='opp'?r.top:r.top+h,bottom:owner==='opp'?r.top+h:r.bottom,height:h};
}
function h117FieldIds(owner){return owner==='opp'?st.opp:st.field}
function h117BringFront(id,owner){const a=h117FieldIds(owner),i=a.indexOf(id);if(i>=0){a.splice(i,1);a.push(id)}}
function h117SnapFieldPosition(c,owner){
  const r=h117HalfRect(owner);if(!r)return null;
  const size=fieldCardSize(),left=c.x/100*r.width,top=c.y/100*r.height,a={left,top,right:left+size.w,bottom:top+size.h,width:size.w,height:size.h};
  let best=null,bestRatio=.65;
  for(const id of h117FieldIds(owner)){
    if(id===c.id)continue;const o=st.cards[id];if(!o)continue;
    const l=o.x/100*r.width,t=o.y/100*r.height,b={left:l,top:t,right:l+size.w,bottom:t+size.h,width:size.w,height:size.h},ratio=overlapRatio(a,b);
    if(ratio>=bestRatio){best=o;bestRatio=ratio}
  }
  if(best){c.x=best.x;c.y=best.y;return best.id}return null;
}
function h117OppRemove(id){
  let i=st.opp.indexOf(id);if(i>=0)st.opp.splice(i,1);
  const p=st.oppPublic||{};
  for(const z of['cmd','deck','discard','exile','tokens']){const a=p[z];if(!Array.isArray(a))continue;i=a.indexOf(id);if(i>=0)a.splice(i,1)}
}
function h117OppPut(id,zone,atTop=false){
  const c=st.cards[id];if(!c)return;
  h117OppRemove(id);c.meta=c.meta||{};c.meta.h117Owner='opp';c.tap=false;
  if(zone==='field'){c.zone='opp';st.opp.push(id);return}
  if(zone==='hand'){c.zone='opp-hand';c.faceDown=false;st.oppPublic.handCount=Math.max(0,(st.oppPublic.handCount||0)+1);return}
  const a=st.oppPublic[zone];if(!Array.isArray(a))return;
  c.zone='opp-'+zone;
  if(zone==='deck'){c.faceDown=!st.oppPublic.deckFlipped;st.oppPublic.deckCount=Math.max(st.oppPublic.deckCount||0,a.length+1)}else c.faceDown=false;
  const newestOnTop=atTop||zone==='discard'||zone==='exile'||zone==='tokens';(newestOnTop?a.unshift(id):a.push(id));
}
function h117SetFieldPosition(c,owner,x,y,faceDown=null){
  const r=h117HalfRect(owner);if(!r||!c)return;
  if(owner==='opp')h117OppPut(c.id,'field');else putInZone(c.id,'field');
  if(faceDown!==null)c.faceDown=faceDown;
  const size=fieldCardSize();
  c.x=Math.max(0,Math.min(100-size.w/r.width*100,(x-r.left-size.w/2)/r.width*100));
  c.y=Math.max(0,Math.min(100-size.h/r.height*100,(y-r.top-size.h/2)/r.height*100));
  h117SnapFieldPosition(c,owner);h117BringFront(c.id,owner);
}
function h117HandBadge(owner){return $('#h117-hand-'+owner)}
function h117HandBadgeHit(owner,x,y){const e=h117HandBadge(owner);return!!e&&pointInRect(x,y,e.getBoundingClientRect())}
async function h117MoveToHiddenHand(id,owner,x=0){
  const c=st.cards[id];if(!c)return;
  if(owner==='opp'){h117OppPut(id,'hand');render();return}
  await moveToHandAt(id,x||($('#hand').getBoundingClientRect().left+8));
}
function h117SnapTargetFor(el,c,owner){
  const a=el.getBoundingClientRect();let best=null,br=0;
  for(const zone of['cmd','discard','deck','exile','tokens']){
    if(zone==='cmd'&&!c.meta?.commander)continue;
    const z=document.querySelector('#h116-piles-'+owner+' [data-h117-zone="'+zone+'"]');if(!z)continue;
    const ratio=overlapRatio(a,z.getBoundingClientRect());if(ratio>=.6&&ratio>br){best={zone};br=ratio}
  }
  return best;
}
async function h117MoveToZone(id,owner,zone){
  const c=st.cards[id];if(!c)return;
  if(owner==='opp'){
    h117OppPut(id,zone,zone==='deck');
    if(zone!=='deck'&&!c.img)await load(c);
    render();return;
  }
  await moveAndMaybeLoad(id,zone,zone==='deck');
}
function h117FullCardEl(c,owner,index){
  const d=cardEl(c,false);d.onclick=null;d.classList.add(owner==='you'?'full-you-card':'full-opp-card','full-mini-card','h117-full-card');
  d.style.left=c.x+'%';d.style.top=(owner==='you'?50+c.y*.5:c.y*.5)+'%';d.style.zIndex=String(20+index);d.dataset.h117Owner=owner;
  let drag=null,moved=false;
  d.onpointerdown=e=>{
    if(e.button!==undefined&&e.button!==0)return;e.preventDefault();moved=false;h117BringFront(c.id,owner);d.style.zIndex='10000';
    const r=h117HalfRect(owner),q=d.getBoundingClientRect();if(!r)return;
    drag={r,dx:e.clientX-q.left,dy:e.clientY-q.top,sx:e.clientX,sy:e.clientY,pid:e.pointerId};try{d.setPointerCapture?.(e.pointerId)}catch{}
  };
  d.onpointermove=e=>{
    if(!drag)return;if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>4)moved=true;if(!moved)return;
    const x=Math.max(0,Math.min(drag.r.width-d.offsetWidth,e.clientX-drag.r.left-drag.dx));
    const y=Math.max(0,Math.min(drag.r.height-d.offsetHeight,e.clientY-drag.r.top-drag.dy));
    c.x=x/drag.r.width*100;c.y=y/drag.r.height*100;d.style.left=c.x+'%';d.style.top=(owner==='you'?50+c.y*.5:c.y*.5)+'%';
  };
  d.onpointerup=async e=>{
    if(!drag)return;try{d.releasePointerCapture?.(drag.pid)}catch{}drag=null;
    if(moved){
      if(owner==='you'&&(handHit(e.clientX,e.clientY)||h117HandBadgeHit('you',e.clientX,e.clientY))){await h117MoveToHiddenHand(c.id,'you',e.clientX);return}
      if(owner==='opp'&&h117HandBadgeHit('opp',e.clientX,e.clientY)){await h117MoveToHiddenHand(c.id,'opp');return}
      const snap=h117SnapTargetFor(d,c,owner);if(snap){await h117MoveToZone(c.id,owner,snap.zone);return}
      h117SnapFieldPosition(c,owner);h117BringFront(c.id,owner);render();return;
    }
    const now=Date.now(),key='h117_'+owner+'_'+c.id,prev=lastTap[key]||0;
    if(now-prev<330){clearTimeout(lastTap[key+'_timer']);delete lastTap[key+'_timer'];lastTap[key]=0;c.tap=!c.tap;render();return}
    lastTap[key]=now;lastTap[key+'_timer']=setTimeout(()=>{if(lastTap[key]===now){lastTap[key]=0;delete lastTap[key+'_timer'];requestAnimationFrame(()=>openBoardZoom(c))}},300);
  };
  d.onpointercancel=()=>{drag=null};d.oncontextmenu=e=>e.preventDefault();return d;
}
function h117PileArray(owner,zone){return owner==='you'?(Array.isArray(st[zone])?st[zone]:[]):(Array.isArray(st.oppPublic?.[zone])?st.oppPublic[zone]:[])}
function h117PileCount(owner,zone){
  if(owner==='opp'&&zone==='deck')return Math.max(st.oppPublic?.deckCount||0,h117PileArray(owner,zone).length);
  return h117PileArray(owner,zone).length;
}
function h117ZoneDrag(el,id,owner,zone,{forceBack=false}={}){
  const c=st.cards[id];if(!c)return;let s=null,ghost=null,moved=false;
  el.onpointerdown=e=>{if(e.target.closest('button'))return;e.preventDefault();s={x:e.clientX,y:e.clientY,pid:e.pointerId};moved=false;try{el.setPointerCapture?.(e.pointerId)}catch{}};
  el.onpointermove=e=>{if(!s)return;if(!moved&&Math.hypot(e.clientX-s.x,e.clientY-s.y)>8){moved=true;ghost=makeGhost(c,forceBack)}if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px'}};
  el.onpointerup=async e=>{
    if(!s)return;const pid=s.pid;s=null;try{el.releasePointerCapture?.(pid)}catch{}ghost?.remove();ghost=null;
    if(!moved){if(zone==='deck'){owner==='you'?openDeckOptions():h117OpenOpponentDeck();return}requestAnimationFrame(()=>openBoardZoom(c));return}
    if(owner==='you'&&(handHit(e.clientX,e.clientY)||h117HandBadgeHit('you',e.clientX,e.clientY))){await h117MoveToHiddenHand(id,'you',e.clientX);return}
    if(owner==='opp'&&h117HandBadgeHit('opp',e.clientX,e.clientY)){await h117MoveToHiddenHand(id,'opp');return}
    const r=h117HalfRect(owner);if(r&&pointInRect(e.clientX,e.clientY,r)){h117SetFieldPosition(c,owner,e.clientX,e.clientY,forceBack);if(!forceBack&&!c.img)await load(c);render()}
  };
  el.onpointercancel=()=>{s=null;ghost?.remove();ghost=null};el.oncontextmenu=e=>e.preventDefault();
}
function h117MakePile(owner,zone,posClass,label,icon){
  const arr=h117PileArray(owner,zone),count=h117PileCount(owner,zone),id=arr[0],c=id?st.cards[id]:null;
  if(zone==='cmd'){
    const wrap=document.createElement('div');wrap.className='cmds h116-pile h116-cmd h117-pile';wrap.dataset.h117Zone='cmd';
    if(!arr.length){const e=document.createElement('div');e.className='cmd';e.dataset.name='COMMANDER';e.dataset.icon='♛';e.innerHTML='<span class="count">0</span>';wrap.appendChild(e)}
    else arr.slice(0,2).forEach(cid=>{const cc=st.cards[cid];if(!cc)return;const e=document.createElement('div');e.className='cmd';e.dataset.name='COMMANDER';e.dataset.icon='♛';e.dataset.h117Zone='cmd';e.innerHTML=face(cc)+'<span class="count">1</span>';h117ZoneDrag(e,cid,owner,'cmd');wrap.appendChild(e)});
    return wrap;
  }
  const el=document.createElement('div');el.className='zone '+zone+' h116-pile '+posClass+' h117-pile';el.dataset.name=label;el.dataset.h117Zone=zone;if(icon)el.dataset.icon=icon;
  if(c){
    if(zone==='deck'){
      const img=document.createElement('img'),flipped=owner==='you'?st.deckFlipped:!!st.oppPublic.deckFlipped;img.src=flipped?(frontImage(c)||BACK):BACK;img.draggable=false;el.appendChild(img)
    }else el.insertAdjacentHTML('beforeend',face(c));
  }else if(zone==='deck'&&count>0){const img=document.createElement('img');img.src=BACK;img.draggable=false;el.appendChild(img)}
  el.insertAdjacentHTML('beforeend','<span class="count">'+count+'</span>');
  if(c)h117ZoneDrag(el,id,owner,zone,{forceBack:zone==='deck'?!((owner==='you'?st.deckFlipped:st.oppPublic.deckFlipped)):false});
  else if(zone==='deck'&&count>0)el.onclick=()=>owner==='you'?openDeckOptions():h117OpenOpponentDeck();
  return el;
}
function h117EnsurePileLayer(owner){
  const content=$('#h105fullcontent');if(!content)return null;let layer=$('#h116-piles-'+owner);
  if(!layer){layer=document.createElement('div');layer.id='h116-piles-'+owner;layer.className='h116-piles h117-piles';content.appendChild(layer)}
  layer.classList.add('h117-piles');return layer;
}
function h117RenderFullPiles(){
  for(const owner of['opp','you']){
    const layer=h117EnsurePileLayer(owner);if(!layer)continue;layer.innerHTML='';
    layer.appendChild(h117MakePile(owner,'cmd','h116-cmd','COMMANDER','♛'));
    layer.appendChild(h117MakePile(owner,'discard','h116-discard','DISCARD','☠'));
    layer.appendChild(h117MakePile(owner,'deck','h116-deck','DECK',''));
    layer.appendChild(h117MakePile(owner,'exile','h116-exile','EXILE','✦'));
    layer.appendChild(h117MakePile(owner,'tokens','h116-tokens','TOKENS','◉'));
  }
}
function h117RenderHandCounts(){
  const content=$('#h105fullcontent');if(!content)return;
  for(const owner of['opp','you']){
    let e=$('#h117-hand-'+owner);if(!e){e=document.createElement('div');e.id='h117-hand-'+owner;e.className='h117-hand-count h117-hand-'+owner;e.dataset.owner=owner;e.innerHTML='<span class="h117-hand-icon"></span><b>0</b>';content.appendChild(e)}
    const n=owner==='you'?st.hand.length:Math.max(0,st.oppPublic?.handCount||0);e.querySelector('b').textContent=String(n);e.setAttribute('aria-label',(owner==='you'?'Your':'Opponent')+' hand: '+n+' cards');
  }
}
function h117SyncCardWidth(){
  const content=$('#h105fullcontent'),field=$('#field');if(!content||!field)return;let sample=field.querySelector('.card'),probe=null;
  if(!sample){probe=document.createElement('div');probe.className='card';probe.style.visibility='hidden';probe.style.pointerEvents='none';field.appendChild(probe);sample=probe}
  const w=parseFloat(getComputedStyle(sample).width);probe?.remove();if(Number.isFinite(w)&&w>0)content.style.setProperty('--h116-field-card-width',w+'px');
}
function h117EnsureOpponentDeckOverlay(){
  let z=$('#h117-opp-deck');if(z)return z;z=document.createElement('section');z.id='h117-opp-deck';z.innerHTML='<div class="h117-opp-deck-box"><div class="h117-opp-deck-head"><b>Opponent Deck</b><button type="button" data-h117-oppdeck="close">×</button></div><div class="h117-opp-deck-status"></div><div class="h117-opp-deck-actions"><button type="button" data-h117-oppdeck="draw">Draw</button><button type="button" data-h117-oppdeck="mill">Mill 1</button><button type="button" data-h117-oppdeck="reveal">Reveal Top</button><button type="button" data-h117-oppdeck="topbottom">Top → Bottom</button><button type="button" data-h117-oppdeck="bottomtop">Bottom → Top</button><button type="button" data-h117-oppdeck="shuffle">Shuffle</button><button type="button" data-h117-oppdeck="cut">Cut</button><button type="button" data-h117-oppdeck="flip">Flip Deck</button></div></div>';document.body.appendChild(z);
  z.addEventListener('click',e=>{if(e.target===z){z.classList.remove('on');return}const b=e.target.closest('[data-h117-oppdeck]');if(!b)return;e.preventDefault();h117OpponentDeckAction(b.dataset.h117Oppdeck)});return z;
}
function h117EmitOpponentAction(action,detail={}){try{window.dispatchEvent(new CustomEvent('mtgtabletop:opponent-action',{detail:{action,...detail}}))}catch{}}
function h117OpenOpponentDeck(){const z=h117EnsureOpponentDeckOverlay();const n=h117PileCount('opp','deck');z.querySelector('.h117-opp-deck-status').textContent=n+' cards · '+(st.oppPublic.deckFlipped?'FACE UP':'FACE DOWN');z.classList.add('on')}
function h117OpponentDeckAction(action){
  const z=h117EnsureOpponentDeckOverlay(),p=st.oppPublic,a=p.deck||[],known=a[0]?st.cards[a[0]]:null;
  if(action==='close'){z.classList.remove('on');return}
  if(action==='draw'){
    if(known){h117OppRemove(known.id);known.zone='opp-hand';p.handCount=Math.max(0,(p.handCount||0)+1);p.deckCount=Math.max(0,(p.deckCount||a.length+1)-1)}
    else if((p.deckCount||0)>0){p.deckCount--;p.handCount=Math.max(0,(p.handCount||0)+1)}
  }else if(action==='mill'&&known){h117OppRemove(known.id);known.faceDown=false;h117OppPut(known.id,'discard');p.deckCount=Math.max(0,(p.deckCount||a.length+1)-1)}
  else if(action==='reveal'&&known){known.faceDown=false;load(known).then(()=>openBoardZoom(known));}
  else if(action==='topbottom'&&a.length>1)a.push(a.shift());
  else if(action==='bottomtop'&&a.length>1)a.unshift(a.pop());
  else if(action==='shuffle'&&a.length>1)shuffle(a);
  else if(action==='cut'&&a.length>1){const n=1+Math.floor(Math.random()*(a.length-1));p.deck=[...a.slice(n),...a.slice(0,n)]}
  else if(action==='flip'){p.deckFlipped=!p.deckFlipped;for(const id of a){const c=st.cards[id];if(c)c.faceDown=!c.faceDown}}
  h117EmitOpponentAction(action);render();h117OpenOpponentDeck();
}
function h117InstallZoomGuard(){
  if(h117ZoomGuardInstalled)return;h117ZoomGuardInstalled=true;
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#boardzoomcontrols [data-zact]');
    if(!b||h117ActiveBoardOwner!=='opp'||!h117ActiveBoardCard)return;
    const a=b.dataset.zact;
    if(!['hand','discard','exile'].includes(a))return;
    e.preventDefault();e.stopImmediatePropagation();
    const c=h117ActiveBoardCard;
    if(a==='hand')h117OppPut(c.id,'hand');
    else h117OppPut(c.id,a);
    h117ActiveBoardCard=null;h117ActiveBoardOwner='you';
    $('#boardzoom')?.classList.remove('on');render();
  },true);
  document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.v!=='full'){h117ActiveBoardCard=null;h117ActiveBoardOwner='you'}}));
}
function h117RenderFullExtras(){h117MarkOwners();h117RenderFullPiles();h117RenderHandCounts();h117SyncCardWidth();h117InstallZoomGuard()}
window.MTG_H117_refreshFullBoard=()=>h117RenderFullExtras();
window.MTGTabletopSetOpponentCounts=(handCount,deckCount)=>{st.oppPublic.handCount=Math.max(0,+handCount||0);st.oppPublic.deckCount=Math.max(0,+deckCount||0);render()};
window.MTGTabletopSetOpponentPublicState=(state={})=>{
  if(Number.isFinite(+state.handCount))st.oppPublic.handCount=Math.max(0,+state.handCount);
  if(Number.isFinite(+state.deckCount))st.oppPublic.deckCount=Math.max(0,+state.deckCount);
  if(typeof state.deckFlipped==='boolean')st.oppPublic.deckFlipped=state.deckFlipped;
  for(const z of['cmd','deck','discard','exile','tokens'])if(Array.isArray(state[z]))st.oppPublic[z]=state[z].filter(id=>st.cards[id]);
  if(Array.isArray(state.field))st.opp=state.field.filter(id=>st.cards[id]);
  h117MarkOwners();render();
};
`;
  out=out.replace('function render(){',helpers+'\nfunction render(){');
  out=out.replace('async function openBoardZoom(c){if(!c)return;',"async function openBoardZoom(c){if(!c)return;h117ActiveBoardCard=c;h117ActiveBoardOwner=h117OwnerForCard(c);");

  out=out.replace(
    "st.field.forEach((id,i)=>{const s=st.cards[id];if(!s)return;const copy={...s,x:s.x,y:50+s.y*.5};const el=cardEl(copy,false);el.classList.add('full-you-card','full-mini-card');el.style.zIndex=String(20+i);ff.appendChild(el)});",
    "st.field.forEach((id,i)=>{const s=st.cards[id];if(!s)return;ff.appendChild(h117FullCardEl(s,'you',i))});"
  );
  out=out.replace(
    "st.opp.forEach((id,i)=>{const s=st.cards[id];if(!s)return;const copy={...s,x:s.x,y:s.y*.5};const el=cardEl(copy,false);el.classList.add('full-opp-card','full-mini-card');el.style.zIndex=String(20+i);ff.appendChild(el)});",
    "st.opp.forEach((id,i)=>{const s=st.cards[id];if(!s)return;ff.appendChild(h117FullCardEl(s,'opp',i))});"
  );

  out=out.replace('renderLife();updateDeckPanel()}','renderLife();h117RenderFullExtras();updateDeckPanel()}');

  out=out.replace(
    "const fr=fieldRect();if(pointInRect(e.clientX,e.clientY,fr)&&!handHit(e.clientX,e.clientY)){placeOnField(id,e.clientX,e.clientY,false);render();return}render();return",
    "if(st.view==='full'){const fr=h117HalfRect('you');if(fr&&pointInRect(e.clientX,e.clientY,fr)&&!handHit(e.clientX,e.clientY)){h117SetFieldPosition(c,'you',e.clientX,e.clientY,false);render();return}}const fr=fieldRect();if(pointInRect(e.clientX,e.clientY,fr)&&!handHit(e.clientX,e.clientY)){placeOnField(id,e.clientX,e.clientY,false);render();return}render();return"
  );

  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+'\n/* H117_FULL_BOARD_INTERACTION_END */\n'+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source.replaceAll('H116','H117');
  if(out.includes('h117-fullboard-interaction-style'))return out;

  const start=out.indexOf('<script id="h116-fullboard-piles-card-size-script">');
  if(start>=0){const end=out.indexOf('</script>',start);if(end>=0)out=out.slice(0,start)+out.slice(end+9)}

  const css=`<style id="h117-fullboard-interaction-style">
#fullcards .h117-full-card{pointer-events:auto!important;touch-action:none!important;cursor:grab!important}
#fullcards .h117-full-card:active{cursor:grabbing!important}
.h117-piles{pointer-events:none!important}
.h117-piles .h117-pile,.h117-piles .h117-pile .cmd{pointer-events:auto!important;touch-action:none!important}
.h117-hand-count{position:absolute;right:72px;z-index:55;display:flex;align-items:center;gap:6px;height:32px;min-width:50px;padding:0 9px;border:1px solid #806a50;border-radius:9px;background:#211b17e8;color:#f5ead8;box-shadow:0 2px 7px #0007;pointer-events:auto;user-select:none}
.h117-hand-opp{top:8px}.h117-hand-you{top:calc(50% + 8px)}
.h117-hand-icon{display:block;width:12px;height:17px;border:1.5px solid #d7b46a;border-radius:2px;box-shadow:3px -3px 0 -1px #211b17,3px -3px 0 0 #8b7659}
.h117-hand-count b{font:900 12px/1 ui-monospace,Menlo,monospace}
#h117-opp-deck{display:none;position:fixed;inset:0;z-index:36000;background:#000b;align-items:center;justify-content:center;padding:14px}
#h117-opp-deck.on{display:flex}.h117-opp-deck-box{width:min(92vw,430px);background:#211b17;border:1px solid #66513e;border-radius:14px;padding:12px;box-shadow:0 16px 40px #000b}.h117-opp-deck-head{display:flex;align-items:center;justify-content:space-between}.h117-opp-deck-head b{font:900 13px/1 ui-monospace,Menlo,monospace}.h117-opp-deck-head button{width:40px;height:40px;border:1px solid #806a50;border-radius:50%;background:#2b231c;color:#fff;font-size:24px}.h117-opp-deck-status{margin:8px 0;color:#c8b89e;font:800 9px/1.2 ui-monospace,Menlo,monospace}.h117-opp-deck-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.h117-opp-deck-actions button{min-height:44px;border:1px solid #806a50;border-radius:8px;background:#30271f;color:#f5ead8;font:800 9px/1.1 ui-monospace,Menlo,monospace}
@media(max-width:390px){.h117-hand-count{right:66px;height:30px;min-width:46px;padding:0 8px}.h117-hand-opp{top:7px}.h117-hand-you{top:calc(50% + 7px)}}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h117-fullboard-interaction-boot">window.addEventListener('DOMContentLoaded',()=>{requestAnimationFrame(()=>window.MTG_H117_refreshFullBoard?.())});</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h116.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
