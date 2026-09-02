import h123 from './worker-h123.js';

const BUILD='H124';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H124_CARD_GESTURE_API'))return source;
  let out=source;

  const helper=`
/* H124_CARD_GESTURE_API
   Battlefield gestures are intentionally separated:
   - single tap: full-card viewer
   - double tap: tap/untap (rotate)
   - long press: move the card */
async function h124CardGestureAction(id,owner,action,x=0,y=0){
  const c=st.cards[id];if(!c)return;
  if(action==='view'){
    requestAnimationFrame(()=>openBoardZoom(c));
    return;
  }
  if(action==='rotate'){
    c.tap=!c.tap;render();return;
  }
  if(action!=='drop')return;

  if(st.view==='full'){
    if(owner==='you'&&(handHit(x,y)||h117HandBadgeHit('you',x,y))){await h117MoveToHiddenHand(id,'you',x);return}
    if(owner==='opp'&&h117HandBadgeHit('opp',x,y)){await h117MoveToHiddenHand(id,'opp');return}

    for(const zone of ['cmd','discard','deck','exile','tokens']){
      if(zone==='cmd'&&!c.meta?.commander)continue;
      const z=document.querySelector('#h116-piles-'+owner+' [data-h117-zone="'+zone+'"], #h116-piles-'+owner+' .h116-'+(zone==='cmd'?'cmd':zone));
      if(z&&pointInRect(x,y,z.getBoundingClientRect())){await h117MoveToZone(id,owner,zone);return}
    }

    const r=h117HalfRect(owner);
    if(r&&pointInRect(x,y,r)){
      h117SetFieldPosition(c,owner,x,y,null);render();return;
    }
    render();return;
  }

  if(owner==='you'){
    if(handHit(x,y)){await moveToHandAt(id,x);return}
    const zones=[['#cmds .cmd','cmd',true],['#discard','discard'],['#deck','deck'],['#exile','exile'],['#tokens','tokens']];
    for(const [sel,zone,commanderOnly] of zones){
      if(commanderOnly&&!c.meta?.commander)continue;
      const z=$(sel);if(z&&pointInRect(x,y,z.getBoundingClientRect())){await moveAndMaybeLoad(id,zone,zone==='deck');return}
    }
    const r=fieldRect();
    if(r&&pointInRect(x,y,r)){placeOnField(id,x,y,null);render();return}
    render();return;
  }

  /* Opponent-side screen. Keep its public battlefield movable too. */
  if(owner==='opp'){
    const r=$('#oppcards')?.getBoundingClientRect();
    if(r&&pointInRect(x,y,r)){
      h117OppPut(id,'field');
      const size=fieldCardSize();
      c.x=Math.max(0,Math.min(100-size.w/r.width*100,(x-r.left-size.w/2)/r.width*100));
      c.y=Math.max(0,Math.min(100-size.h/r.height*100,(y-r.top-size.h/2)/r.height*100));
      h117SnapFieldPosition(c,'opp');h117BringFront(id,'opp');render();return;
    }
    render();
  }
}
window.MTG_H124_cardGesture=h124CardGestureAction;
`;

  out=out.replace('function render(){',helper+'\nfunction render(){');
  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+'\n/* H124_CARD_GESTURE_API_END */\n'+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source;
  if(out.includes('h124-card-gesture-style'))return out;

  /* H123 selected/froze cards immediately on pointerdown. H124 owns the whole
     gesture recognizer instead, so remove that old listener before installing
     the long-press-aware version. */
  out=out.replace(/<script id="h123-card-drag-lock-script">[\s\S]*?<\/script>/,'');
  out=out.replace(/<style id="h123-card-drag-lock-style">[\s\S]*?<\/style>/,'');
  out=out.replaceAll('H123','H124');

  const css=`<style id="h124-card-gesture-style">
/* A card is highlighted only after the long press has actually armed movement. */
#field .card.h124-card-selected,
#oppcards .card.h124-card-selected,
#fullcards .card.h124-card-selected,
.h124-drag-ghost.h124-card-selected{
  outline:3px solid #e8bd58!important;
  outline-offset:2px!important;
  box-shadow:0 0 0 1px rgba(35,27,19,.92),0 0 11px rgba(232,189,88,.78),0 8px 17px rgba(0,0,0,.5)!important;
}
#field .card,#oppcards .card,#fullcards .card{
  -webkit-user-select:none!important;
  user-select:none!important;
  -webkit-touch-callout:none!important;
  -webkit-user-drag:none!important;
}
.h124-drag-source{opacity:.14!important;box-shadow:none!important}
.h124-drag-ghost{
  position:fixed!important;
  z-index:51000!important;
  margin:0!important;
  pointer-events:none!important;
  touch-action:none!important;
  user-select:none!important;
  -webkit-user-select:none!important;
  -webkit-user-drag:none!important;
  opacity:.99!important;
  will-change:left,top!important;
}
.h124-drag-ghost img{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important;pointer-events:none!important;-webkit-user-drag:none!important}

/* Only after a long press is armed do we freeze Full Board scrolling. */
html.h124-full-card-dragging #h105fullviewport,
body.h124-full-card-dragging #h105fullviewport{
  overflow-y:hidden!important;
  overflow-x:hidden!important;
  touch-action:none!important;
  overscroll-behavior:none!important;
  -webkit-overflow-scrolling:auto!important;
}
html.h124-card-dragging #fullcards .card:not(.h124-card-selected),
html.h124-card-dragging #h116-piles-you,
html.h124-card-dragging #h116-piles-opp,
html.h124-card-dragging #h105fullcontent .life-heart{
  pointer-events:none!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h124-card-gesture-script">window.addEventListener('DOMContentLoaded',()=>{
    const HOLD_MS=360;
    const DOUBLE_MS=285;
    const CANCEL_DISTANCE=11;
    const MOVE_DISTANCE=3;
    let gesture=null;
    const tapTimers=new Map();

    const api=(id,owner,action,x,y)=>window.MTG_H124_cardGesture?.(id,owner,action,x,y);
    const fullViewport=()=>document.getElementById('h105fullviewport');
    const ownerFor=card=>card.closest('#fullcards')?(card.dataset.h117Owner||'you'):(card.closest('#oppcards')?'opp':'you');
    const keyFor=(id,owner)=>owner+':'+id;

    const clearVisual=()=>{
      document.querySelectorAll('.h124-card-selected').forEach(el=>el.classList.remove('h124-card-selected'));
      document.querySelectorAll('.h124-drag-source').forEach(el=>el.classList.remove('h124-drag-source'));
      document.querySelectorAll('.h124-drag-ghost').forEach(el=>el.remove());
      document.documentElement.classList.remove('h124-card-dragging','h124-full-card-dragging');
      document.body.classList.remove('h124-card-dragging','h124-full-card-dragging');
    };

    const cleanup=()=>{
      if(!gesture){clearVisual();return}
      clearTimeout(gesture.holdTimer);
      const viewport=gesture.viewport,scrollTop=gesture.scrollTop,wasLong=gesture.long;
      gesture.ghost?.remove();
      gesture.card?.classList.remove('h124-card-selected','h124-drag-source');
      gesture=null;
      document.documentElement.classList.remove('h124-card-dragging','h124-full-card-dragging');
      document.body.classList.remove('h124-card-dragging','h124-full-card-dragging');
      if(wasLong&&viewport){viewport.scrollTop=scrollTop;requestAnimationFrame(()=>{viewport.scrollTop=scrollTop})}
    };

    const armLongPress=()=>{
      const g=gesture;if(!g||g.cancelled||g.long)return;
      g.long=true;
      g.card.classList.add('h124-card-selected','h124-drag-source');
      const q=g.card.getBoundingClientRect();
      g.dx=g.lastX-q.left;g.dy=g.lastY-q.top;
      const ghost=g.card.cloneNode(true);
      ghost.removeAttribute('id');
      ghost.classList.remove('h124-drag-source');
      ghost.classList.add('h124-drag-ghost','h124-card-selected');
      ghost.style.left=q.left+'px';ghost.style.top=q.top+'px';ghost.style.width=q.width+'px';ghost.style.height=q.height+'px';
      document.body.appendChild(ghost);g.ghost=ghost;
      document.documentElement.classList.add('h124-card-dragging');
      document.body.classList.add('h124-card-dragging');
      if(g.full){
        document.documentElement.classList.add('h124-full-card-dragging');
        document.body.classList.add('h124-full-card-dragging');
        if(g.viewport){g.viewport.scrollTop=g.scrollTop;requestAnimationFrame(()=>{if(gesture===g)g.viewport.scrollTop=g.scrollTop})}
      }
      try{navigator.vibrate?.(8)}catch{}
    };

    const finishTap=(g,x,y)=>{
      const key=keyFor(g.id,g.owner),old=tapTimers.get(key);
      if(old){
        clearTimeout(old);tapTimers.delete(key);
        api(g.id,g.owner,'rotate',x,y);
        return;
      }
      const timer=setTimeout(()=>{
        tapTimers.delete(key);
        api(g.id,g.owner,'view',x,y);
      },DOUBLE_MS);
      tapTimers.set(key,timer);
    };

    document.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0)return;
      const card=e.target.closest?.('#fullcards .card, #field .card, #oppcards .card');
      if(!card||card.classList.contains('h124-drag-ghost')||card.classList.contains('h118-full-drag-ghost'))return;

      /* Stop the legacy card pointer handlers. H124 owns the complete gesture
         from this point so tap/double-tap/hold cannot fire each other. */
      e.preventDefault();e.stopImmediatePropagation();
      cleanup();
      const id=card.dataset.id;if(!id)return;
      const owner=ownerFor(card),full=!!card.closest('#fullcards'),viewport=full?fullViewport():null;
      gesture={card,id,owner,full,viewport,scrollTop:viewport?viewport.scrollTop:0,pid:e.pointerId,sx:e.clientX,sy:e.clientY,lastX:e.clientX,lastY:e.clientY,long:false,moved:false,cancelled:false,ghost:null,dx:0,dy:0,holdTimer:null};
      gesture.holdTimer=setTimeout(armLongPress,HOLD_MS);
    },true);

    document.addEventListener('pointermove',e=>{
      const g=gesture;if(!g||e.pointerId!==g.pid)return;
      e.stopImmediatePropagation();
      g.lastX=e.clientX;g.lastY=e.clientY;
      const dx=e.clientX-g.sx,dy=e.clientY-g.sy,dist=Math.hypot(dx,dy);

      /* Moving before the hold threshold means the player did not intend to
         grab the card. On Full Board, translate that early movement into the
         same vertical board scroll so a swipe beginning over a card still pans. */
      if(!g.long&&dist>CANCEL_DISTANCE){
        clearTimeout(g.holdTimer);g.cancelled=true;
        if(g.full&&g.viewport){
          const max=Math.max(0,g.viewport.scrollHeight-g.viewport.clientHeight);
          g.viewport.scrollTop=Math.max(0,Math.min(max,g.scrollTop-dy));
        }
        return;
      }
      if(!g.long)return;

      e.preventDefault();
      if(dist>MOVE_DISTANCE)g.moved=true;
      if(g.viewport&&Math.abs(g.viewport.scrollTop-g.scrollTop)>.5)g.viewport.scrollTop=g.scrollTop;
      if(g.ghost){g.ghost.style.left=(e.clientX-g.dx)+'px';g.ghost.style.top=(e.clientY-g.dy)+'px'}
    },true);

    document.addEventListener('pointerup',e=>{
      const g=gesture;if(!g||e.pointerId!==g.pid)return;
      e.preventDefault();e.stopImmediatePropagation();
      clearTimeout(g.holdTimer);
      const wasLong=g.long,moved=g.moved,cancelled=g.cancelled,id=g.id,owner=g.owner,x=e.clientX,y=e.clientY;
      cleanup();
      if(wasLong){if(moved)api(id,owner,'drop',x,y);return}
      if(cancelled)return;
      finishTap({id,owner},x,y);
    },true);

    document.addEventListener('pointercancel',e=>{if(gesture&&e.pointerId===gesture.pid){e.stopImmediatePropagation();cleanup()}},true);

    const viewport=fullViewport();
    viewport?.addEventListener('scroll',()=>{
      const g=gesture;if(!g?.long||!g.full||g.viewport!==viewport)return;
      if(Math.abs(viewport.scrollTop-g.scrollTop)>.5)viewport.scrollTop=g.scrollTop;
    });
    window.addEventListener('blur',cleanup);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)cleanup()});
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h123.fetch(request,env,ctx);
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
