import h122 from './worker-h122.js';

const BUILD='H123';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replaceAll('H122','H123');
  if(out.includes('h123-card-drag-lock-style'))return out;

  const css=`<style id="h123-card-drag-lock-style">
/* H123: a pressed battlefield card becomes the one active movable object.
   Use an outline rather than a border so card dimensions/coordinates never shift. */
#field .card.h123-card-selected,
#oppcards .card.h123-card-selected,
#fullcards .card.h123-card-selected,
.h118-full-drag-ghost.h123-card-selected{
  outline:3px solid #e8bd58!important;
  outline-offset:2px!important;
  box-shadow:0 0 0 1px rgba(35,27,19,.9),0 0 10px rgba(232,189,88,.72),0 7px 16px rgba(0,0,0,.5)!important;
}

/* While moving a Full Board card, freeze the virtual table completely. This
   prevents Safari momentum/pan scrolling from changing the coordinate frame
   underneath the card during the drag. */
html.h123-full-card-dragging #h105fullviewport,
body.h123-full-card-dragging #h105fullviewport{
  overflow-y:hidden!important;
  overflow-x:hidden!important;
  touch-action:none!important;
  overscroll-behavior:none!important;
  -webkit-overflow-scrolling:auto!important;
}
html.h123-full-card-dragging #h105fullcontent,
html.h123-full-card-dragging #fullcards{
  touch-action:none!important;
}

/* Only the selected Full Board card owns touch input during its move. Other
   cards and board controls cannot steal the gesture, while geometric drop-zone
   checks in the game code continue to work normally. */
html.h123-full-card-dragging #fullcards .card:not(.h123-card-selected),
html.h123-full-card-dragging #h116-piles-you,
html.h123-full-card-dragging #h116-piles-opp,
html.h123-full-card-dragging #h105fullcontent .life-heart{
  pointer-events:none!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h123-card-drag-lock-script">window.addEventListener('DOMContentLoaded',()=>{
    let active=null;

    const fullViewport=()=>document.getElementById('h105fullviewport');
    const clearSelected=()=>document.querySelectorAll('.h123-card-selected').forEach(el=>el.classList.remove('h123-card-selected'));

    const freezeFullBoard=(card,pointerId)=>{
      const viewport=fullViewport();
      const scrollTop=viewport?viewport.scrollTop:0;
      active={card,pointerId,viewport,scrollTop,full:true};
      card.classList.add('h123-card-selected');
      document.documentElement.classList.add('h123-full-card-dragging');
      document.body.classList.add('h123-full-card-dragging');
      if(viewport){
        viewport.scrollTop=scrollTop;
        requestAnimationFrame(()=>{if(active?.full&&active.viewport===viewport)viewport.scrollTop=active.scrollTop});
      }
    };

    const selectNormalBoard=(card,pointerId)=>{
      active={card,pointerId,viewport:null,scrollTop:0,full:false};
      card.classList.add('h123-card-selected');
    };

    const release=pointerId=>{
      if(!active)return;
      if(pointerId!==undefined&&pointerId!==null&&active.pointerId!==pointerId)return;
      const viewport=active.viewport,scrollTop=active.scrollTop;
      active=null;
      clearSelected();
      document.documentElement.classList.remove('h123-full-card-dragging');
      document.body.classList.remove('h123-full-card-dragging');
      if(viewport){
        viewport.scrollTop=scrollTop;
        requestAnimationFrame(()=>{viewport.scrollTop=scrollTop});
      }
    };

    /* Capture phase runs before the game's existing card drag handlers. That
       means the source is highlighted and Full Board is frozen before Safari
       gets a chance to interpret the gesture as scrolling. */
    document.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0)return;
      const card=e.target.closest?.('#fullcards .card, #field .card, #oppcards .card');
      if(!card||card.classList.contains('h118-full-drag-ghost'))return;
      clearSelected();
      if(card.closest('#fullcards'))freezeFullBoard(card,e.pointerId);
      else selectNormalBoard(card,e.pointerId);
    },true);

    document.addEventListener('pointerup',e=>release(e.pointerId));
    document.addEventListener('pointercancel',e=>release(e.pointerId));
    document.addEventListener('lostpointercapture',e=>{if(active&&e.pointerId===active.pointerId)release(e.pointerId)});

    /* iOS can deliver a final momentum scroll event that was already queued
       before the card received pointer capture. Hold the Full Board at the
       exact starting scroll position for the entire selected-card gesture. */
    const viewport=fullViewport();
    viewport?.addEventListener('scroll',()=>{
      if(!active?.full||active.viewport!==viewport)return;
      if(Math.abs(viewport.scrollTop-active.scrollTop)>.5)viewport.scrollTop=active.scrollTop;
    });

    window.addEventListener('blur',()=>release());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h122.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
