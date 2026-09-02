import h121 from './worker-h121.js';

const BUILD='H122';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H122_FULL_BOARD_PLAYER_PILES'))return source;
  let out=source;

  const helper=`
/* H122_FULL_BOARD_PLAYER_PILES */
function h122PileCardId(zone,index=0){
  const arr=Array.isArray(st[zone])?st[zone]:[];
  return arr[index]||null;
}
function h122FixedPileGhost(el,c,forceBack=false){
  const q=el.getBoundingClientRect();
  const g=document.createElement('div');
  g.className='card h122-pile-drag-ghost';
  g.style.left=q.left+'px';g.style.top=q.top+'px';g.style.width=q.width+'px';g.style.height=q.height+'px';
  if(forceBack)g.innerHTML='<img src="'+BACK+'">';
  else g.innerHTML=face(c);
  document.body.appendChild(g);
  return{g,q};
}
function h122WireOnePile(el,id,zone,{forceBack=false}={}){
  if(!el||!id)return;
  const c=st.cards[id];if(!c)return;
  el.dataset.h122Wired=id;
  el.style.pointerEvents='auto';
  el.style.touchAction='none';
  let drag=null,ghost=null,moved=false;
  const cleanup=()=>{ghost?.remove();ghost=null;drag=null;moved=false};
  el.onpointerdown=e=>{
    if(e.button!==undefined&&e.button!==0)return;
    if(e.target.closest?.('button'))return;
    e.preventDefault();e.stopPropagation();
    const q=el.getBoundingClientRect();
    drag={pid:e.pointerId,sx:e.clientX,sy:e.clientY,dx:e.clientX-q.left,dy:e.clientY-q.top,w:q.width,h:q.height};
    try{el.setPointerCapture?.(e.pointerId)}catch{}
  };
  el.onpointermove=e=>{
    if(!drag)return;
    if(!moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>7){
      moved=true;const made=h122FixedPileGhost(el,c,forceBack);ghost=made.g;
    }
    if(ghost){ghost.style.left=(e.clientX-drag.dx)+'px';ghost.style.top=(e.clientY-drag.dy)+'px'}
  };
  el.onpointerup=async e=>{
    if(!drag)return;
    const d=drag;try{el.releasePointerCapture?.(d.pid)}catch{}
    if(!moved){
      cleanup();
      if(zone==='deck'){openDeckOptions();return}
      requestAnimationFrame(()=>openBoardZoom(c));
      return;
    }
    const target=ghost||el;
    if(handHit(e.clientX,e.clientY)||h117HandBadgeHit('you',e.clientX,e.clientY)){
      cleanup();await h117MoveToHiddenHand(id,'you',e.clientX);return;
    }
    const snap=h117SnapTargetFor(target,c,'you');
    if(snap&&snap.zone!==zone){cleanup();await h117MoveToZone(id,'you',snap.zone);return}
    const r=h117HalfRect('you');
    if(r&&pointInRect(e.clientX,e.clientY,r)){
      cleanup();h117SetFieldPosition(c,'you',e.clientX,e.clientY,forceBack);
      if(!forceBack&&!c.img)await load(c);
      render();return;
    }
    cleanup();render();
  };
  el.onpointercancel=cleanup;
  el.oncontextmenu=e=>e.preventDefault();
}
function h122WirePlayerFullPiles(){
  const layer=$('#h116-piles-you');if(!layer)return;
  layer.classList.remove('h120-fallback');
  layer.style.pointerEvents='none';

  const cmdIds=Array.isArray(st.cmd)?st.cmd:[];
  const cmdEls=[...layer.querySelectorAll('.h116-cmd .cmd')];
  cmdEls.forEach((el,i)=>{const id=cmdIds[i];if(id)h122WireOnePile(el,id,'cmd')});

  for(const zone of['discard','deck','exile','tokens']){
    const el=layer.querySelector('.h116-'+zone);if(!el)continue;
    const id=h122PileCardId(zone);if(!id)continue;
    const forceBack=zone==='deck'&&!st.deckFlipped;
    h122WireOnePile(el,id,zone,{forceBack});
  }
}
function h122RefreshInteractivePiles(){
  try{h117RenderFullPiles()}catch{}
  requestAnimationFrame(()=>h122WirePlayerFullPiles());
}
window.MTG_H122_refreshPiles=h122RefreshInteractivePiles;
`;

  out=out.replace('function h117RenderHandCounts(){',helper+'\nfunction h117RenderHandCounts(){');
  out=out.replace(
    "function h117RenderFullExtras(){h118InstallGeometryCapture();if(st.view==='you')h118CaptureGeometry('you');else if(st.view==='opp')h118CaptureGeometry('opp');h117MarkOwners();h117RenderFullPiles();h117RenderHandCounts();h117SyncCardWidth();h117InstallZoomGuard()}",
    "function h117RenderFullExtras(){h118InstallGeometryCapture();if(st.view==='you')h118CaptureGeometry('you');else if(st.view==='opp')h118CaptureGeometry('opp');h117MarkOwners();h117RenderFullPiles();h117RenderHandCounts();h117SyncCardWidth();h117InstallZoomGuard();requestAnimationFrame(()=>h122WirePlayerFullPiles())}"
  );

  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+'\n/* H122_FULL_BOARD_PLAYER_PILES_END */\n'+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source.replaceAll('H121','H122');
  if(out.includes('h122-interactive-player-piles'))return out;

  const css=`<style id="h122-interactive-player-piles">
/* Player Full Board piles must win hit-testing over the scroll surface. */
#h116-piles-you{z-index:80!important;pointer-events:none!important}
#h116-piles-you .h116-pile,
#h116-piles-you .h116-pile .cmd{
  z-index:81!important;
  pointer-events:auto!important;
  touch-action:none!important;
  -webkit-user-select:none!important;
  user-select:none!important;
  -webkit-touch-callout:none!important;
}
#h116-piles-you .h116-pile img,
#h116-piles-you .h116-pile .cmd img{-webkit-user-drag:none!important;pointer-events:none!important}
.h122-pile-drag-ghost{
  position:fixed!important;
  z-index:50050!important;
  margin:0!important;
  pointer-events:none!important;
  touch-action:none!important;
  transform:none!important;
  opacity:.98!important;
  box-shadow:0 8px 20px #0009!important;
}
.h122-pile-drag-ghost img{width:100%!important;height:100%!important;object-fit:contain!important;pointer-events:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h122-interactive-player-piles-boot">window.addEventListener('DOMContentLoaded',()=>{
    const refresh=()=>requestAnimationFrame(()=>window.MTG_H122_refreshPiles?.());
    refresh();
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.v==='full')refresh()}));
    for(const sel of['#cmds','#discard','#deck','#exile','#tokens']){
      const el=document.querySelector(sel);if(el)new MutationObserver(refresh).observe(el,{childList:true,subtree:true,attributes:true});
    }
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h121.fetch(request,env,ctx);
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
