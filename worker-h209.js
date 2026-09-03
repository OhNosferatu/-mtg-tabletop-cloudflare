import h208 from './worker-h208.js';

const BUILD='H209';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H209_OBJECT_VIEW_API'))return out;

  const helper=`
/* H209_OBJECT_VIEW_API
   Direct, ID-based access to the existing full-card battlefield viewer. This
   stays inside app.js so it can safely use the current card state/load helpers
   without changing any board geometry, drag, rotate, pile, or token behavior. */
window.MTG_H209_openBoardObject=async function(id){
  const c=st.cards?.[id];if(!c)return false;
  try{if(!c.img)await load(c)}catch{}
  requestAnimationFrame(()=>openBoardZoom(c));
  return true;
};
`;
  out=out.replace('function render(){',helper+'\nfunction render(){');
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h209-object-view-reliability'))return out;

  const css=`<style id="h209-object-view-reliability-style">
/* Keep the existing fullscreen object surfaces explicitly interactive. */
#boardzoom.on,
#inspect.on,
#h164-token-editor.on,
#h94zonecard.on{
  pointer-events:auto!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h209-object-view-reliability">window.addEventListener('DOMContentLoaded',()=>{
    /* H124 remains the primary gesture system. This is only a narrow fallback:
       if a clean single tap reaches pointerup but the existing viewer has not
       opened after H124's double-tap window, open that same viewer by card ID.
       Double taps, long presses, drags, and Full Board swipes are left alone. */
    const DOUBLE_MS=300,HOLD_MS=360,CANCEL_DISTANCE=11;
    let g=null;
    const pending=new Map();
    const ownerFor=card=>card.closest('#fullcards')?(card.dataset.h117Owner||'you'):(card.closest('#oppcards')?'opp':'you');
    const keyFor=(card,id)=>ownerFor(card)+':'+id;
    const viewerOpen=()=>document.getElementById('boardzoom')?.classList.contains('on')||document.getElementById('inspect')?.classList.contains('on');

    window.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0)return;
      const card=e.target.closest?.('#field .card, #oppcards .card, #fullcards .card');
      if(!card||card.classList.contains('h124-drag-ghost')||card.classList.contains('h118-full-drag-ghost'))return;
      const id=card.dataset.id;if(!id)return;
      g={card,id,pid:e.pointerId,sx:e.clientX,sy:e.clientY,moved:false,started:performance.now()};
    },true);

    window.addEventListener('pointermove',e=>{
      if(!g||e.pointerId!==g.pid)return;
      if(Math.hypot(e.clientX-g.sx,e.clientY-g.sy)>CANCEL_DISTANCE)g.moved=true;
    },true);

    window.addEventListener('pointerup',e=>{
      const cur=g;if(!cur||e.pointerId!==cur.pid)return;g=null;
      const elapsed=performance.now()-cur.started;
      if(cur.moved||elapsed>=HOLD_MS)return;
      const key=keyFor(cur.card,cur.id),old=pending.get(key);
      if(old){clearTimeout(old);pending.delete(key);return}
      const timer=setTimeout(()=>{
        pending.delete(key);
        if(viewerOpen())return;
        window.MTG_H209_openBoardObject?.(cur.id);
      },DOUBLE_MS+55);
      pending.set(key,timer);
    },true);

    window.addEventListener('pointercancel',e=>{if(g&&e.pointerId===g.pid)g=null},true);
    window.addEventListener('blur',()=>{g=null;for(const t of pending.values())clearTimeout(t);pending.clear()});
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h208.fetch(request,env,ctx);
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
