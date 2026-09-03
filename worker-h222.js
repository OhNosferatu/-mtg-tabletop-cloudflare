import h217 from './worker-h217.js';

const BUILD='H222';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h222-fullboard-preposition-before-reveal'))return out;

  /* Keep H217 as the confirmed geometry/alignment baseline. Remove only the two
     legacy Full Board opening writes that fight scroll memory. */
  out=out.replace(
    "if(btn.dataset.v==='full')centerBoard();",
    "if(btn.dataset.v==='full')syncBar();/* h222-fullboard-preposition-before-reveal */"
  );
  out=out.replace(
    "requestAnimationFrame(()=>requestAnimationFrame(()=>{layout();viewport.scrollTop=0;clamp()}));",
    "requestAnimationFrame(()=>requestAnimationFrame(()=>{layout();clamp()}));/* h222-fullboard-preposition-before-reveal */"
  );

  /* H221 proved that keeping #full laid out preserves scroll perfectly, but doing
     so continuously lets hidden Full Board geometry participate in observers and
     caused the dedicated board alignment regressions. Instead, briefly lay out
     Full Board only during the transition, position it BEFORE it is revealed,
     then return to normal display:none screen isolation immediately after click. */
  const oldRestore=`fullTab?.addEventListener('click',()=>{
      openingFull=true;
      const wanted=savedScroll;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        savedScroll=wanted;restoreScroll();
        setTimeout(()=>{savedScroll=wanted;restoreScroll()},90);
      }));
    },true);`;
  const newRestore=`fullTab?.addEventListener('click',()=>{
      /* h222-fullboard-preposition-before-reveal */
      const full=document.getElementById('full');
      if(full&&!full.classList.contains('on'))document.body.classList.add('h222-full-prewarm');
      /* Force the temporary hidden Full Board to participate in layout now, not
         on a later animation frame. Safari can then accept the saved scrollTop
         before the screen becomes visible. */
      void viewport.offsetHeight;
      const wanted=Math.max(0,Math.min(maxScroll(),savedScroll));
      openingFull=true;
      viewport.scrollTop=wanted;
      const bar=document.getElementById('h105fullscroll');if(bar)bar.value=String(Math.round(wanted));
      requestAnimationFrame(()=>{openingFull=false;alignOpponentCards()});
    },true);`;
  out=out.replace(oldRestore,newRestore);

  const css=`<style id="h222-fullboard-preposition-before-reveal-style">
/* Normal inactive screens remain display:none exactly as in H217. Full Board is
   temporarily laid out invisibly only between the Full Board activation gesture
   and the actual view switch. This gives Safari a real scroll box to position
   without allowing hidden Full Board geometry to remain active afterward. */
body.h222-full-prewarm #full.screen:not(.on){
  display:block!important;
  visibility:hidden!important;
  pointer-events:none!important;
}

/* H197's 115ms safety hide was needed when several older handlers were writing
   different scroll positions after Full Board became visible. H222 positions the
   viewport synchronously before reveal and disables those writers, so reveal the
   already-positioned viewport immediately. */
body.h197-full-settling #full.on #h105fullviewport,
body.h197-full-settling #full.on #h105fullscroll{
  visibility:visible!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h222-fullboard-preposition-before-reveal">window.addEventListener('DOMContentLoaded',()=>{
    const fullTab=document.querySelector('[data-v="full"]');
    if(!fullTab)return;

    /* Pointerdown gives the capture-phase H178 replacement above a guaranteed
       laid-out Full Board before click. The click fallback also adds this class,
       so keyboard/programmatic activation still works. */
    const prewarm=()=>{
      const full=document.getElementById('full');
      if(full&&!full.classList.contains('on')){
        document.body.classList.add('h222-full-prewarm');
        void full.offsetHeight;
      }
    };
    const cleanup=()=>document.body.classList.remove('h222-full-prewarm');

    fullTab.addEventListener('pointerdown',prewarm,true);
    fullTab.addEventListener('touchstart',prewarm,{capture:true,passive:true});
    /* This listener is registered after the legacy view-switch handlers, so by
       the time it runs #full already has .on. Removing prewarm here restores the
       exact H217 screen-isolation model with no persistent hidden board. */
    fullTab.addEventListener('click',()=>requestAnimationFrame(cleanup));
    fullTab.addEventListener('pointercancel',cleanup,true);
    window.addEventListener('blur',cleanup);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h217.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
