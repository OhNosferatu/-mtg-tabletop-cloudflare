import h117 from './worker-h117.js';

const BUILD='H118';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function replaceBlock(source,startToken,endToken,replacement){
  const start=source.indexOf(startToken);
  const end=source.indexOf(endToken,start);
  if(start<0||end<0)return source;
  return source.slice(0,start)+replacement+source.slice(end);
}

function transformApp(source){
  if(source.includes('H118_EXACT_FULL_BOARD_DRAG'))return source;
  let out=source;

  out=replaceBlock(out,'function h117SnapFieldPosition(c,owner){','function h117OppRemove',`
/* H118_EXACT_FULL_BOARD_DRAG
   Full Board must be a second view of the exact same battlefield coordinates,
   not its own coordinate system. Cache the normal side geometry while that
   screen is visible and map Full Board positions through those measurements. */
const h118GeometryCache={you:null,opp:null};
function h118CaptureGeometry(owner){
  const screen=$(owner==='opp'?'#opp':'#you'),layer=$(owner==='opp'?'#oppcards':'#field');
  if(!screen)return null;
  const sr=screen.getBoundingClientRect();
  if(!(sr.width>1&&sr.height>1))return h118GeometryCache[owner];
  const lr=layer?.getBoundingClientRect();
  const usable=lr&&lr.width>1&&lr.height>1?lr:sr;
  const g={
    fieldLeft:(usable.left-sr.left)/sr.width,
    fieldTop:(usable.top-sr.top)/sr.height,
    fieldWidth:usable.width/sr.width,
    fieldHeight:usable.height/sr.height
  };
  h118GeometryCache[owner]=g;
  return g;
}
function h118Geometry(owner){
  const fresh=h118CaptureGeometry(owner);if(fresh)return fresh;
  if(h118GeometryCache[owner])return h118GeometryCache[owner];
  const other=h118GeometryCache[owner==='you'?'opp':'you'];
  if(other)return{...other};
  return{fieldLeft:0,fieldTop:0,fieldWidth:1,fieldHeight:1};
}
function h118CardPixels(){
  const content=$('#h105fullcontent');
  const css=content?getComputedStyle(content):null;
  const w=parseFloat(css?.getPropertyValue('--h116-field-card-width'))||parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w'))||91;
  return{w,h:w/.716};
}
function h118FullPosition(c,owner){
  const g=h118Geometry(owner);
  const x=(g.fieldLeft+(c.x/100)*g.fieldWidth)*100;
  const yh=(g.fieldTop+(c.y/100)*g.fieldHeight)*100;
  return{x,y:owner==='you'?50+yh*.5:yh*.5};
}
function h118CommitFullTopLeft(c,owner,leftClient,topClient,w,h){
  const half=h117HalfRect(owner);if(!half||!c)return;
  const g=h118Geometry(owner);
  const sx=(leftClient-half.left)/half.width;
  const sy=(topClient-half.top)/half.height;
  let x=((sx-g.fieldLeft)/Math.max(.0001,g.fieldWidth))*100;
  let y=((sy-g.fieldTop)/Math.max(.0001,g.fieldHeight))*100;
  const cardFieldW=(w/Math.max(1,half.width))/Math.max(.0001,g.fieldWidth)*100;
  const cardFieldH=(h/Math.max(1,half.height))/Math.max(.0001,g.fieldHeight)*100;
  x=Math.max(0,Math.min(Math.max(0,100-cardFieldW),x));
  y=Math.max(0,Math.min(Math.max(0,100-cardFieldH),y));
  c.x=x;c.y=y;
}
function h118MakeDragGhost(el){
  const q=el.getBoundingClientRect(),g=el.cloneNode(true);
  g.classList.add('h118-full-drag-ghost');
  g.removeAttribute('id');
  g.style.left=q.left+'px';g.style.top=q.top+'px';g.style.width=q.width+'px';g.style.height=q.height+'px';
  g.style.zIndex='50000';g.style.pointerEvents='none';g.style.margin='0';
  document.body.appendChild(g);
  return{g,q};
}
function h118InstallGeometryCapture(){
  if(document.documentElement.dataset.h118GeometryCapture)return;
  document.documentElement.dataset.h118GeometryCapture='1';
  requestAnimationFrame(()=>h118CaptureGeometry('you'));
  document.addEventListener('pointerdown',e=>{
    const b=e.target.closest?.('[data-v]');if(!b)return;
    if(st.view==='you')h118CaptureGeometry('you');
    else if(st.view==='opp')h118CaptureGeometry('opp');
  },true);
  window.addEventListener('resize',()=>{if(st.view==='you')h118CaptureGeometry('you');else if(st.view==='opp')h118CaptureGeometry('opp')},{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(()=>{if(st.view==='you')h118CaptureGeometry('you');else if(st.view==='opp')h118CaptureGeometry('opp')},80),{passive:true});
}
function h117SnapFieldPosition(c,owner){
  const half=h117HalfRect(owner);if(!half)return null;
  const g=h118Geometry(owner),size=h118CardPixels();
  const fw=half.width*g.fieldWidth,fh=half.height*g.fieldHeight;
  const left=c.x/100*fw,top=c.y/100*fh,a={left,top,right:left+size.w,bottom:top+size.h,width:size.w,height:size.h};
  let best=null,bestRatio=.65;
  for(const id of h117FieldIds(owner)){
    if(id===c.id)continue;const o=st.cards[id];if(!o)continue;
    const l=o.x/100*fw,t=o.y/100*fh,b={left:l,top:t,right:l+size.w,bottom:t+size.h,width:size.w,height:size.h},ratio=overlapRatio(a,b);
    if(ratio>=bestRatio){best=o;bestRatio=ratio}
  }
  if(best){c.x=best.x;c.y=best.y;return best.id}return null;
}
`);

  out=replaceBlock(out,'function h117SetFieldPosition(c,owner,x,y,faceDown=null){','function h117HandBadge',`
function h117SetFieldPosition(c,owner,x,y,faceDown=null){
  if(!c)return;
  if(owner==='opp')h117OppPut(c.id,'field');else putInZone(c.id,'field');
  if(faceDown!==null)c.faceDown=faceDown;
  const size=h118CardPixels();
  h118CommitFullTopLeft(c,owner,x-size.w/2,y-size.h/2,size.w,size.h);
  h117SnapFieldPosition(c,owner);h117BringFront(c.id,owner);
}
`);

  out=replaceBlock(out,'function h117FullCardEl(c,owner,index){','function h117PileArray',`
function h117FullCardEl(c,owner,index){
  const d=cardEl(c,false);d.onclick=null;d.classList.add(owner==='you'?'full-you-card':'full-opp-card','full-mini-card','h117-full-card');
  const pos=h118FullPosition(c,owner);d.style.left=pos.x+'%';d.style.top=pos.y+'%';d.style.zIndex=String(20+index);d.dataset.h117Owner=owner;
  let drag=null,moved=false,ghost=null;
  const cleanup=()=>{ghost?.remove();ghost=null;d.classList.remove('h118-drag-source')};
  d.onpointerdown=e=>{
    if(e.button!==undefined&&e.button!==0)return;e.preventDefault();moved=false;h117BringFront(c.id,owner);d.style.zIndex='10000';
    const q=d.getBoundingClientRect();
    drag={dx:e.clientX-q.left,dy:e.clientY-q.top,sx:e.clientX,sy:e.clientY,pid:e.pointerId,w:q.width,h:q.height};
    try{d.setPointerCapture?.(e.pointerId)}catch{}
  };
  d.onpointermove=e=>{
    if(!drag)return;
    if(!moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>4){
      moved=true;const made=h118MakeDragGhost(d);ghost=made.g;drag.w=made.q.width;drag.h=made.q.height;d.classList.add('h118-drag-source')
    }
    if(!moved||!ghost)return;
    ghost.style.left=(e.clientX-drag.dx)+'px';ghost.style.top=(e.clientY-drag.dy)+'px';
  };
  d.onpointerup=async e=>{
    if(!drag)return;const info=drag;try{d.releasePointerCapture?.(info.pid)}catch{}drag=null;
    if(moved){
      const left=e.clientX-info.dx,top=e.clientY-info.dy,targetEl=ghost||d;
      if(owner==='you'&&(handHit(e.clientX,e.clientY)||h117HandBadgeHit('you',e.clientX,e.clientY))){cleanup();await h117MoveToHiddenHand(c.id,'you',e.clientX);return}
      if(owner==='opp'&&h117HandBadgeHit('opp',e.clientX,e.clientY)){cleanup();await h117MoveToHiddenHand(c.id,'opp');return}
      const snap=h117SnapTargetFor(targetEl,c,owner);if(snap){cleanup();await h117MoveToZone(c.id,owner,snap.zone);return}
      h118CommitFullTopLeft(c,owner,left,top,info.w,info.h);h117SnapFieldPosition(c,owner);h117BringFront(c.id,owner);cleanup();render();return;
    }
    cleanup();
    const now=Date.now(),key='h117_'+owner+'_'+c.id,prev=lastTap[key]||0;
    if(now-prev<330){clearTimeout(lastTap[key+'_timer']);delete lastTap[key+'_timer'];lastTap[key]=0;c.tap=!c.tap;render();return}
    lastTap[key]=now;lastTap[key+'_timer']=setTimeout(()=>{if(lastTap[key]===now){lastTap[key]=0;delete lastTap[key+'_timer'];requestAnimationFrame(()=>openBoardZoom(c))}},300);
  };
  d.onpointercancel=()=>{drag=null;moved=false;cleanup()};d.oncontextmenu=e=>e.preventDefault();return d;
}
`);

  out=out.replace(
    'function h117RenderFullExtras(){h117MarkOwners();h117RenderFullPiles();h117RenderHandCounts();h117SyncCardWidth();h117InstallZoomGuard()}',
    'function h117RenderFullExtras(){h118InstallGeometryCapture();if(st.view===\'you\')h118CaptureGeometry(\'you\');else if(st.view===\'opp\')h118CaptureGeometry(\'opp\');h117MarkOwners();h117RenderFullPiles();h117RenderHandCounts();h117SyncCardWidth();h117InstallZoomGuard()}'
  );

  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+'\n/* H118_EXACT_FULL_BOARD_DRAG_END */\n'+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source.replaceAll('H117','H118');
  if(out.includes('h118-fullboard-drag-fix'))return out;
  const css=`<style id="h118-fullboard-drag-fix">
/* Safari can leave compositor trails when an absolute card is repainted inside
   the momentum-scrolling Full Board. Drag one fixed clone instead and leave the
   source inert until the final coordinates are committed. */
#fullcards .h117-full-card{ -webkit-user-drag:none!important; user-select:none!important; -webkit-user-select:none!important; }
#fullcards .h117-full-card.h118-drag-source{opacity:.12!important;box-shadow:none!important}
.h118-full-drag-ghost{position:fixed!important;z-index:50000!important;pointer-events:none!important;touch-action:none!important;user-select:none!important;-webkit-user-select:none!important;-webkit-user-drag:none!important;opacity:.98!important;will-change:left,top!important;contain:paint!important}
.h118-full-drag-ghost img{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important;pointer-events:none!important;-webkit-user-drag:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h117.fetch(request,env,ctx);
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
