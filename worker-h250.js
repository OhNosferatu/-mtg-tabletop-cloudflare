import h247 from './worker-h247.js';

const BUILD='H250';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H250_FULLBOARD_DEDICATED_PILE_PARITY'))return out;

  const helper=`
/* H250_FULLBOARD_DEDICATED_PILE_PARITY
   Full Board does not maintain a separate pile-movement model. Its pile cards
   are only another view of the same game state, so use the exact movement
   functions already used by the dedicated Your Side and Opponent screens:
     - h211PlaceField for battlefield placement
     - h117MoveToHiddenHand for hand moves
     - h117MoveToZone / moveAndMaybeLoad for pile moves
   Full Board contributes only coordinate mapping and hit testing. */
function h250PileArray(owner,zone){
  return owner==='you'?(Array.isArray(st[zone])?st[zone]:[]):(Array.isArray(st.oppPublic?.[zone])?st.oppPublic[zone]:[]);
}
function h250DeckFlipped(owner){return owner==='you'?!!st.deckFlipped:!!st.oppPublic?.deckFlipped}
function h250FullToDedicated(owner,x,y){
  const src=h117HalfRect(owner);
  const dst=owner==='opp'?$('#oppcards')?.getBoundingClientRect():fieldRect();
  if(!src||!dst||!src.width||!src.height||!dst.width||!dst.height)return null;
  const rx=Math.max(0,Math.min(1,(x-src.left)/src.width));
  const ry=Math.max(0,Math.min(1,(y-src.top)/src.height));
  return{x:dst.left+rx*dst.width,y:dst.top+ry*dst.height};
}
function h250OwnerAt(x,y){
  const opp=h117HalfRect('opp'),you=h117HalfRect('you');
  if(opp&&pointInRect(x,y,opp))return'opp';
  if(you&&pointInRect(x,y,you))return'you';
  return null;
}
function h250FullPileTarget(owner,el,c,sourceZone){
  const a=el.getBoundingClientRect();let best=null,bestRatio=0;
  for(const zone of['cmd','discard','deck','exile','tokens']){
    if(zone===sourceZone)continue;
    if(zone==='cmd'&&!c.meta?.commander)continue;
    const z=document.querySelector('#h116-piles-'+owner+' [data-h117-zone="'+zone+'"],#h116-piles-'+owner+' .h116-'+(zone==='cmd'?'cmd':zone));
    if(!z)continue;
    const ratio=overlapRatio(a,z.getBoundingClientRect());
    /* Match the dedicated Your Side pile snap threshold. */
    if(ratio>=.8&&ratio>bestRatio){best=zone;bestRatio=ratio}
  }
  return best;
}
function h250PileGhost(el,c,forceBack){
  const q=el.getBoundingClientRect(),g=document.createElement('div');
  g.className='card h250-pile-ghost';
  g.style.left=q.left+'px';g.style.top=q.top+'px';g.style.width=q.width+'px';g.style.height=q.height+'px';
  g.innerHTML=forceBack?'<img src="'+BACK+'" draggable="false">':face(c);
  document.body.appendChild(g);return g;
}
function h250AdjustOpponentDeckLeaving(id,sourceOwner,sourceZone){
  if(sourceOwner!=='opp'||sourceZone!=='deck')return;
  const p=st.oppPublic;if(!p||!Array.isArray(p.deck)||!p.deck.includes(id))return;
  p.deckCount=Math.max(0,(Number(p.deckCount)||0)-1);
}
function h250WirePile(el,owner,zone,index=0){
  if(!el)return;
  el.dataset.h250Pile=owner+':'+zone+':'+index;
  el.style.pointerEvents='auto';el.style.touchAction='none';
  let drag=null,ghost=null,moved=false;
  const cleanup=()=>{ghost?.remove();ghost=null;drag=null;moved=false};

  /* Replace, rather than layer on top of, H117/H122's Full Board-only handlers. */
  el.onpointerdown=e=>{
    if(e.button!==undefined&&e.button!==0)return;
    if(e.target.closest?.('button'))return;
    const id=h250PileArray(owner,zone)[index];if(!id||!st.cards[id])return;
    e.preventDefault();e.stopPropagation();
    const q=el.getBoundingClientRect();
    drag={id,pid:e.pointerId,sx:e.clientX,sy:e.clientY,dx:e.clientX-q.left,dy:e.clientY-q.top,forceBack:zone==='deck'&&!h250DeckFlipped(owner)};
    try{el.setPointerCapture?.(e.pointerId)}catch{}
  };
  el.onpointermove=e=>{
    if(!drag||e.pointerId!==drag.pid)return;
    if(!moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>7){
      moved=true;const c=st.cards[drag.id];if(!c)return;
      ghost=h250PileGhost(el,c,drag.forceBack);
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

    const visual=ghost||el;
    if(owner==='you'&&(handHit(e.clientX,e.clientY)||h117HandBadgeHit('you',e.clientX,e.clientY))){
      cleanup();await h117MoveToHiddenHand(info.id,'you',e.clientX);return;
    }
    if(owner==='opp'&&h117HandBadgeHit('opp',e.clientX,e.clientY)){
      cleanup();h250AdjustOpponentDeckLeaving(info.id,owner,zone);await h117MoveToHiddenHand(info.id,'opp');return;
    }

    const pile=h250FullPileTarget(owner,visual,c,zone);
    if(pile){
      cleanup();
      /* These are the same canonical zone moves used outside Full Board. */
      if(owner==='you')await moveAndMaybeLoad(info.id,pile,pile==='deck');
      else{h250AdjustOpponentDeckLeaving(info.id,owner,zone);await h117MoveToZone(info.id,'opp',pile)}
      return;
    }

    const targetOwner=h250OwnerAt(e.clientX,e.clientY);
    if(targetOwner){
      const mapped=h250FullToDedicated(targetOwner,e.clientX,e.clientY);
      if(mapped){
        h250AdjustOpponentDeckLeaving(info.id,owner,zone);
        cleanup();
        /* This is literally the dedicated-board placement path. H243 has already
           disabled card-to-card magnetic snap, so the release position remains free. */
        h211PlaceField(c,targetOwner,mapped.x,mapped.y,targetOwner==='opp'?'opp':'you');
        if(!info.forceBack&&!c.img)await load(c);
        render();return;
      }
    }
    cleanup();render();
  };
  el.onpointercancel=cleanup;el.oncontextmenu=e=>e.preventDefault();
}
function h250WireFullPiles(){
  for(const owner of['you','opp']){
    const layer=$('#h116-piles-'+owner);if(!layer)continue;
    const cmdEls=[...layer.querySelectorAll('.h116-cmd .cmd')];
    cmdEls.forEach((el,i)=>h250WirePile(el,owner,'cmd',i));
    for(const zone of['discard','deck','exile','tokens']){
      const el=layer.querySelector('.h116-'+zone);if(el)h250WirePile(el,owner,zone,0);
    }
  }
}

/* H122's separate player-Full-Board pile controller is no longer needed. Keep
   its render refreshes, but prevent it from reinstalling a second movement model. */
try{h122WirePlayerFullPiles=()=>{}}catch{}
const h250RenderFullPiles=h117RenderFullPiles;
h117RenderFullPiles=function(){
  h250RenderFullPiles();
  requestAnimationFrame(()=>h250WireFullPiles());
};
window.MTG_H250_wireFullPiles=h250WireFullPiles;
`;

  out=out.replace('function render(){',helper+'\nfunction render(){');
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h250-fullboard-dedicated-pile-parity'))return out;
  const css=`<style id="h250-fullboard-dedicated-pile-parity-style">
.h250-pile-ghost{
  position:fixed!important;z-index:52000!important;margin:0!important;
  pointer-events:none!important;touch-action:none!important;transform:none!important;
  opacity:.99!important;box-shadow:0 8px 20px #0009!important;
}
.h250-pile-ghost img{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important;pointer-events:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');
  const script=`<script id="h250-fullboard-dedicated-pile-parity">window.addEventListener('DOMContentLoaded',()=>{
    const wire=()=>requestAnimationFrame(()=>window.MTG_H250_wireFullPiles?.());
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
    /* Build from H247: keep the confirmed Full Board overlap/free-placement fix,
       but remove H248/H249's separate Full Board state-transfer experiments. */
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
