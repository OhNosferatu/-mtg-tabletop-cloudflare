import h247 from './worker-h247.js';

const BUILD='H249';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H249_FULLBOARD_AUTHORITATIVE_PILES'))return out;

  const helper=`
/* H249_FULLBOARD_AUTHORITATIVE_PILES
   Full Board pile elements are visual mirrors of the real game arrays. Older
   H117/H122 handlers can hold a stale card id across rerenders, which makes a
   drag look successful while the source pile still owns the card. H249 gives
   every Full Board pile one authoritative move path: resolve the real current
   id at pointerdown, detach it from all source collections, then add that exact
   id to the destination collection. */
function h249RemoveId(arr,id){
  if(!Array.isArray(arr))return false;
  const i=arr.indexOf(id);if(i<0)return false;arr.splice(i,1);return true;
}
function h249Detach(id){
  const p=st.oppPublic||{};
  const wasOppDeck=Array.isArray(p.deck)&&p.deck.includes(id);
  removeFromAll(id);
  h117OppRemove(id);
  if(wasOppDeck)p.deckCount=Math.max(0,(Number(p.deckCount)||0)-1);
}
function h249PileIds(owner,zone){
  if(owner==='you')return Array.isArray(st[zone])?st[zone]:[];
  const p=st.oppPublic||{};return Array.isArray(p[zone])?p[zone]:[];
}
function h249DeckFlipped(owner){return owner==='you'?!!st.deckFlipped:!!st.oppPublic?.deckFlipped}
function h249AddToZone(id,owner,zone){
  const c=st.cards[id];if(!c)return false;
  c.meta=c.meta||{};c.meta.h117Owner=owner;c.tap=false;
  if(owner==='you'){
    c.zone=zone;
    if(zone==='deck'){
      c.faceDown=!st.deckFlipped;st.deck.unshift(id);
    }else if(zone==='cmd'){
      c.faceDown=false;st.cmd.push(id);
    }else{
      c.faceDown=false;
      const a=st[zone];if(!Array.isArray(a))return false;
      if(zone==='discard'||zone==='exile'||zone==='tokens')a.unshift(id);else a.push(id);
    }
    return true;
  }
  const p=st.oppPublic||(st.oppPublic={cmd:[],deck:[],discard:[],exile:[],tokens:[],handCount:0,deckCount:0,deckFlipped:false});
  const a=p[zone];if(!Array.isArray(a))return false;
  c.zone='opp-'+zone;
  if(zone==='deck'){
    c.faceDown=!p.deckFlipped;a.unshift(id);p.deckCount=Math.max(0,Number(p.deckCount)||0)+1;
  }else if(zone==='cmd'){
    c.faceDown=false;a.push(id);
  }else{
    c.faceDown=false;
    if(zone==='discard'||zone==='exile'||zone==='tokens')a.unshift(id);else a.push(id);
  }
  return true;
}
function h249PlaceFullField(c,owner,x,y,faceDown=null){
  if(!c)return false;
  const r=h117HalfRect(owner);if(!r||!r.width||!r.height)return false;
  const tapped=!!c.tap;
  h249Detach(c.id);
  c.meta=c.meta||{};c.meta.h117Owner=owner;
  if(owner==='opp'){
    c.zone='opp';st.opp.push(c.id);
  }else{
    c.zone='field';st.field.push(c.id);
  }
  if(faceDown!==null)c.faceDown=faceDown;
  const size=fieldCardSize();
  c.x=Math.max(0,Math.min(100-size.w/r.width*100,(x-r.left-size.w/2)/r.width*100));
  c.y=Math.max(0,Math.min(100-size.h/r.height*100,(y-r.top-size.h/2)/r.height*100));
  c.tap=tapped;h117BringFront(c.id,owner);return true;
}

/* Every legacy Full Board route now lands in the same authoritative helpers. */
h117SetFieldPosition=function(c,owner,x,y,faceDown=null){h249PlaceFullField(c,owner,x,y,faceDown)};
h117MoveToZone=async function(id,owner,zone){
  const c=st.cards[id];if(!c)return;
  h249Detach(id);
  if(!h249AddToZone(id,owner,zone)){render();return}
  if(zone!=='deck'&&!c.img)await load(c);
  render();
};

function h249PileTarget(owner,target,c,sourceZone){
  if(!target)return null;
  const a=target.getBoundingClientRect();let best=null,ratioBest=0;
  for(const zone of['cmd','discard','deck','exile','tokens']){
    if(zone===sourceZone)continue;
    if(zone==='cmd'&&!c.meta?.commander)continue;
    const z=document.querySelector('#h116-piles-'+owner+' [data-h117-zone="'+zone+'"],#h116-piles-'+owner+' .h116-'+(zone==='cmd'?'cmd':zone));
    if(!z)continue;
    const ratio=overlapRatio(a,z.getBoundingClientRect());
    if(ratio>=.6&&ratio>ratioBest){best=zone;ratioBest=ratio}
  }
  return best;
}
function h249Ghost(el,c,forceBack){
  const q=el.getBoundingClientRect(),g=document.createElement('div');
  g.className='card h249-pile-drag-ghost';
  g.style.left=q.left+'px';g.style.top=q.top+'px';g.style.width=q.width+'px';g.style.height=q.height+'px';
  g.innerHTML=forceBack?'<img src="'+BACK+'" draggable="false">':face(c);
  document.body.appendChild(g);return{g,q};
}
function h249WirePile(el,owner,zone,index=0){
  if(!el)return;
  el.dataset.h249Pile=owner+':'+zone+':'+index;
  el.style.pointerEvents='auto';el.style.touchAction='none';
  let drag=null,ghost=null,moved=false;
  const cleanup=()=>{ghost?.remove();ghost=null;drag=null;moved=false};
  el.onpointerdown=e=>{
    if(e.button!==undefined&&e.button!==0)return;
    if(e.target.closest?.('button'))return;
    const id=h249PileIds(owner,zone)[index];if(!id||!st.cards[id])return;
    e.preventDefault();e.stopPropagation();
    const q=el.getBoundingClientRect();
    drag={id,pid:e.pointerId,sx:e.clientX,sy:e.clientY,dx:e.clientX-q.left,dy:e.clientY-q.top,forceBack:zone==='deck'&&!h249DeckFlipped(owner)};
    try{el.setPointerCapture?.(e.pointerId)}catch{}
  };
  el.onpointermove=e=>{
    if(!drag||e.pointerId!==drag.pid)return;
    if(!moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>7){
      moved=true;const c=st.cards[drag.id];if(!c)return;const made=h249Ghost(el,c,drag.forceBack);ghost=made.g;
    }
    if(ghost){ghost.style.left=(e.clientX-drag.dx)+'px';ghost.style.top=(e.clientY-drag.dy)+'px'}
  };
  el.onpointerup=async e=>{
    if(!drag||e.pointerId!==drag.pid)return;
    const info=drag,c=st.cards[info.id];try{el.releasePointerCapture?.(info.pid)}catch{}
    if(!c){cleanup();render();return}
    if(!moved){
      cleanup();
      if(zone==='deck'){owner==='you'?openDeckOptions():h117OpenOpponentDeck();return}
      requestAnimationFrame(()=>openBoardZoom(c));return;
    }
    const target=ghost||el;
    const gr=target.getBoundingClientRect();
    const centerX=gr.left+gr.width/2,centerY=gr.top+gr.height/2;
    if(owner==='you'&&(handHit(e.clientX,e.clientY)||h117HandBadgeHit('you',e.clientX,e.clientY))){
      cleanup();await h117MoveToHiddenHand(info.id,'you',e.clientX);return;
    }
    if(owner==='opp'&&h117HandBadgeHit('opp',e.clientX,e.clientY)){
      cleanup();await h117MoveToHiddenHand(info.id,'opp');return;
    }
    const pile=h249PileTarget(owner,target,c,zone);
    if(pile){cleanup();await h117MoveToZone(info.id,owner,pile);return}
    const r=h117HalfRect(owner);
    if(r&&pointInRect(centerX,centerY,r)){
      cleanup();h249PlaceFullField(c,owner,centerX,centerY,info.forceBack);
      if(!info.forceBack&&!c.img)await load(c);
      render();return;
    }
    cleanup();render();
  };
  el.onpointercancel=cleanup;el.oncontextmenu=e=>e.preventDefault();
}
function h249WireFullPiles(){
  for(const owner of['you','opp']){
    const layer=$('#h116-piles-'+owner);if(!layer)continue;
    const cmdEls=[...layer.querySelectorAll('.h116-cmd .cmd')];
    cmdEls.forEach((el,i)=>h249WirePile(el,owner,'cmd',i));
    for(const zone of['discard','deck','exile','tokens']){
      const el=layer.querySelector('.h116-'+zone);if(el)h249WirePile(el,owner,zone,0);
    }
  }
}
const h249RenderFullPiles=h117RenderFullPiles;
h117RenderFullPiles=function(){
  h249RenderFullPiles();
  /* H122 rewires player piles one frame later. Run after that legacy pass so
     H249 is always the final handler installed on both Full Board pile layers. */
  requestAnimationFrame(()=>requestAnimationFrame(h249WireFullPiles));
};
window.MTG_H249_wireFullPiles=h249WireFullPiles;
`;
  out=out.replace('function render(){',helper+'\nfunction render(){');
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h249-fullboard-authoritative-piles'))return out;
  const css=`<style id="h249-fullboard-authoritative-piles-style">
.h249-pile-drag-ghost{
  position:fixed!important;z-index:52000!important;margin:0!important;
  pointer-events:none!important;touch-action:none!important;transform:none!important;
  opacity:.99!important;box-shadow:0 8px 20px #0009!important;
}
.h249-pile-drag-ghost img{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important;pointer-events:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');
  const script=`<script id="h249-fullboard-authoritative-piles">window.addEventListener('DOMContentLoaded',()=>{
    const wire=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>window.MTG_H249_wireFullPiles?.()));
    document.querySelector('[data-v="full"]')?.addEventListener('click',wire);
    window.addEventListener('pageshow',wire);wire();setTimeout(wire,120);
  });</script>`;
  out=out.replace('</body>',script+'\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    /* Build directly from H247. H248's partial state monkey-patch is excluded;
       H249 replaces it with one authoritative Full Board pile transfer system. */
    const response=await h247.fetch(request,env,ctx);
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
