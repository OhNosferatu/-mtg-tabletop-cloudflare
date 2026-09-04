import h236 from './worker-h236.js';

const BUILD='H237';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h237-seamless-fullboard-resume'))return out;

  /* Two historical Full Board open handlers still act like anchors before H178
     restores the remembered scroll position: H105 centers the old virtual board
     and H176 then forces scrollTop=0. That intermediate write is harmless when
     the remembered position is already near the opponent/top edge, which is why
     Opponent -> Full Board looks smooth, but it produces the player-side snap.
     Stop those opening writes; their normal scroll-bar/layout logic remains. */
  out=out.replace(
    "if(btn.dataset.v==='full')centerBoard();",
    "if(btn.dataset.v==='full')syncBar();/* h237-seamless-fullboard-resume */"
  );
  out=out.replace(
    "requestAnimationFrame(()=>requestAnimationFrame(()=>{layout();viewport.scrollTop=0;clamp()}));",
    "requestAnimationFrame(()=>requestAnimationFrame(()=>{layout();clamp()}));/* h237-seamless-fullboard-resume */"
  );

  /* H178 already owns the saved Full Board position. Instead of revealing Full
     Board at a temporary anchor and correcting it later, briefly give the hidden
     screen layout, apply H178's saved scroll synchronously, then reveal it. */
  const oldRestore=`fullTab?.addEventListener('click',()=>{
      openingFull=true;
      const wanted=savedScroll;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        savedScroll=wanted;restoreScroll();
        setTimeout(()=>{savedScroll=wanted;restoreScroll()},90);
      }));
    },true);`;
  const newRestore=`fullTab?.addEventListener('click',()=>{
      /* h237-seamless-fullboard-resume */
      const full=document.getElementById('full');
      if(full&&!full.classList.contains('on'))document.body.classList.add('h237-full-prewarm');
      /* Safari clamps scrollTop while a display:none scroll box has no layout.
         Force one hidden layout pass so the exact remembered position can be
         installed before any visible Full Board frame exists. */
      void viewport.offsetHeight;
      const wanted=Math.max(0,Math.min(maxScroll(),savedScroll));
      openingFull=true;
      viewport.scrollTop=wanted;
      const bar=document.getElementById('h105fullscroll');if(bar)bar.value=String(Math.round(wanted));
      requestAnimationFrame(()=>{openingFull=false;alignOpponentCards()});
    },true);`;
  out=out.replace(oldRestore,newRestore);

  /* H217's pile calibration is correct, but recalculating it on every tab click
     temporarily lays out a hidden Full Board again. The screen width does not
     change when switching tabs, so keep startup/resize/orientation measurement
     and remove only the two view-switch measurements. */
  out=out.replace(
    `    document.querySelector('[data-v="full"]')?.addEventListener('click',()=>requestAnimationFrame(measure));\n    document.querySelector('[data-v="you"]')?.addEventListener('click',measure);`,
    `    /* h237-seamless-fullboard-resume: no tab-click remeasure; startup and resize remain authoritative. */`
  );

  const css=`<style id="h237-seamless-fullboard-resume-style">
/* Full Board participates in layout only during the activation gesture, and is
   invisible while that remembered scroll position is installed. This avoids the
   persistent hidden-board geometry problems from H221. */
body.h237-full-prewarm #full.screen:not(.on){
  display:block!important;
  visibility:hidden!important;
  pointer-events:none!important;
}

/* H197 hid the viewport while the old center/top writers settled. H237 removes
   those writers and prepositions before reveal, so there is no wrong frame left
   to hide. Keep H197 in the chain for compatibility but reveal the already-set
   viewport immediately. */
body.h197-full-settling #full.on #h105fullviewport,
body.h197-full-settling #full.on #h105fullscroll{
  visibility:visible!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h237-seamless-fullboard-resume">window.addEventListener('DOMContentLoaded',()=>{
    const fullTab=document.querySelector('.tabs [data-v="full"]');
    const full=document.getElementById('full');
    if(!fullTab||!full)return;

    const prewarm=()=>{
      if(full.classList.contains('on'))return;
      document.body.classList.add('h237-full-prewarm');
      /* Resolve layout on pointerdown so H178's capture click listener receives
         a real scroll box, regardless of whether we came from You or Opponent. */
      void full.offsetHeight;
    };
    const cleanup=()=>document.body.classList.remove('h237-full-prewarm');

    fullTab.addEventListener('pointerdown',prewarm,true);
    fullTab.addEventListener('touchstart',prewarm,{capture:true,passive:true});
    fullTab.addEventListener('click',()=>requestAnimationFrame(cleanup));
    fullTab.addEventListener('pointercancel',cleanup,true);
    window.addEventListener('blur',cleanup);
  });</script>`;
  out=out.replace('</body>',script+'\n<!-- h237-seamless-fullboard-resume -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h236.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
