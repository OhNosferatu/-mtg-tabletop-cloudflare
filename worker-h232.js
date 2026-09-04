import h229 from './worker-h229.js';

const BUILD='H232';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h232-opponent-h124-parity'))return out;

  const script=`<script id="h232-opponent-h124-parity">window.addEventListener('DOMContentLoaded',()=>{
    /* H232 deliberately returns to H229 and removes the H230/H231 fallback
       experiments. Dedicated Opponent cards now get the same gesture contract
       as every other battlefield card: single tap=view, double tap=90deg rotate,
       long press=move. The dedicated screen waits longer for the second tap on
       iPhone Safari. The existing H124 action bridge remains the source of truth
       for all card actions. */
    const HOLD_MS=360;
    const DOUBLE_MS=450;
    const CANCEL_DISTANCE=11;
    const MOVE_DISTANCE=3;
    let gesture=null;
    const tapTimers=new Map();

    const activeCard=e=>{
      if(!document.body.classList.contains('h157-opp-mode'))return null;
      return e.target.closest?.('#oppcards .card[data-id]')||null;
    };
    const api=(id,action,x,y)=>window.MTG_H124_cardGesture?.(id,'opp',action,x,y);
    const keyFor=id=>'opp:'+id;

    const clearVisual=()=>{
      document.querySelectorAll('#oppcards .h124-card-selected').forEach(el=>el.classList.remove('h124-card-selected'));
      document.querySelectorAll('#oppcards .h124-drag-source').forEach(el=>el.classList.remove('h124-drag-source'));
      document.querySelectorAll('.h232-opp-drag-ghost').forEach(el=>el.remove());
      document.documentElement.classList.remove('h124-card-dragging');
      document.body.classList.remove('h124-card-dragging');
    };
    const cleanup=()=>{
      if(gesture)clearTimeout(gesture.holdTimer);
      gesture?.ghost?.remove();
      gesture?.card?.classList.remove('h124-card-selected','h124-drag-source');
      gesture=null;clearVisual();
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
      ghost.classList.add('h124-drag-ghost','h124-card-selected','h232-opp-drag-ghost');
      ghost.style.left=q.left+'px';ghost.style.top=q.top+'px';ghost.style.width=q.width+'px';ghost.style.height=q.height+'px';
      document.body.appendChild(ghost);g.ghost=ghost;
      document.documentElement.classList.add('h124-card-dragging');
      document.body.classList.add('h124-card-dragging');
      try{navigator.vibrate?.(8)}catch{}
    };
    const finishTap=(id,x,y)=>{
      const key=keyFor(id),old=tapTimers.get(key);
      if(old){
        clearTimeout(old);tapTimers.delete(key);
        api(id,'rotate',x,y);
        return;
      }
      const timer=setTimeout(()=>{
        tapTimers.delete(key);
        api(id,'view',x,y);
      },DOUBLE_MS);
      tapTimers.set(key,timer);
    };

    /* Listen at window capture so these events are normalized before the older
       document-level H124 recognizer sees the dedicated Opponent card. This does
       not affect Your Side or Full Board at all. H209's earlier window observer
       may still see the tap, but its viewer fallback exits once the H124 viewer
      is already open. */
    window.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0)return;
      const card=activeCard(e);if(!card)return;
      e.preventDefault();e.stopImmediatePropagation();
      cleanup();
      const id=card.dataset.id;if(!id)return;
      gesture={card,id,pid:e.pointerId,sx:e.clientX,sy:e.clientY,lastX:e.clientX,hastY:e.clientY,long:false,moved:false,cancelled:false,ghost:null,dx:0,dy:0,holdTimer:null};
      gesture.holdTimer=setTimeout(armLongPress,HOLD_MS);
    },true);

    window.addEventListener('pointermove',e=>{
      const g=gesture;if(!g||e.pointerId!==g.pid)return;
      e.stopImmediatePropagation();
      g.lastX=e.clientX;g.lastY=e.clientY;
      const dist=Math.hypot(e.clientX-g.sx,e.clientY-g.sy);
      if(!g.long&&dist>CANCEL_DISTANCE){clearTimeout(g.holdTimer);g.cancelled=true;return}
      if(!g.long)return;
      e.preventDefault();
      if(dist>MOVE_DISTANCE)g.moved=true;
      if(g.ghost){g.ghost.style.left=(e.clientX-g.dx)+'px';g.ghost.style.top=(e.clientY-g.dy)+'px'}
    },true);

    window.addEventListener('pointerup',e=>{
      const g=gesture;if(!g||e.pointerId!==g.pid)return;
      e.preventDefault();e.stopImmediatePropagation();
      clearTimeout(g.holdTimer);
      const wasLong=g.long,moved=g.moved,cancelled=g.cancelled,id=g.id,x=e.clientX,y=e.clientY;
      cleanup();
      if(wasLong){if(moved)api(id,'drop',x,y);return}
      if(cancelled)return;
      finishTap(id,x,y);
    },true);

    window.addEventListener('pointercancel',e=>{if(gesture&&e.pointerId===gesture.pid){e.stopImmediatePropagation();cleanup()}},true);
    window.addEventListener('blur',()=>{cleanup();for(const t of tapTimers.values())clearTimeout(t);tapTimers.clear()});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cleanup();for(const t of tapTimers.values())clearTimeout(t);tapTimers.clear()}});
  });</script>`;

  out=out.replace('</body>',script+'\n<!-- h232-opponent-h124-parity -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD},{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h229.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
