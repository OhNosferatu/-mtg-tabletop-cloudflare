import h225 from './worker-h225.js';

const BUILD='H226';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h226-stage-your-to-full'))return out;

  const css=`<style id="h226-stage-your-to-full-style">
/* H226 targets only the one transition that still jitters: Your Side -> Full Board.
   Keep Your Side painted for a few frames while Full Board is laid out invisibly
   at its deterministic player anchor. Then swap the two screens only after the
   Full Board scroll box has remained at that anchor across multiple paints.
   Opponent -> Full Board is already stable and is left completely unchanged. */
body.h226-stage-your-to-full #you.screen{
  display:block!important;
  visibility:visible!important;
  pointer-events:none!important;
}
body.h226-stage-your-to-full #full.screen{
  display:block!important;
  visibility:hidden!important;
  pointer-events:none!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h226-stage-your-to-full">window.addEventListener('DOMContentLoaded',()=>{
    const fullTab=document.querySelector('[data-v="full"]');
    const youTab=document.querySelector('[data-v="you"]');
    const full=document.getElementById('full');
    const viewport=document.getElementById('h105fullviewport');
    const content=document.getElementById('h105fullcontent');
    if(!fullTab||!youTab||!full||!viewport||!content)return;

    let active=false,target=0,raf=0;
    const maxScroll=()=>Math.max(0,content.scrollHeight-viewport.clientHeight);
    const playerAnchor=()=>Math.max(0,Math.min(maxScroll(),viewport.clientHeight));
    const syncBar=()=>{
      const bar=document.getElementById('h105fullscroll');
      if(bar)bar.value=String(Math.round(viewport.scrollTop));
    };
    const cancel=()=>{
      active=false;cancelAnimationFrame(raf);raf=0;
      document.body.classList.remove('h226-stage-your-to-full');
    };

    const prepare=()=>{
      /* Capture the source on pointerdown, before any tab handler can change .on. */
      if(!youTab.classList.contains('on'))return;
      cancel();active=true;
      document.body.classList.add('h226-stage-your-to-full');

      /* Full Board now has real geometry but remains invisible behind Your Side.
         Set the player anchor before the click/view switch occurs. */
      void full.offsetHeight;
      target=playerAnchor();
      viewport.scrollTop=target;
      syncBar();
    };

    const settle=()=>{
      if(!active)return;
      /* H176 can recalculate the bounded Full Board height when the screen becomes
         active. Recompute the exact player anchor from the current real viewport
         and reassert it while Full Board is still invisible. */
      target=playerAnchor();
      if(Math.abs(viewport.scrollTop-target)>.5)viewport.scrollTop=target;
      syncBar();

      raf=requestAnimationFrame(()=>{
        if(!active)return;
        target=playerAnchor();
        if(Math.abs(viewport.scrollTop-target)>.5)viewport.scrollTop=target;
        syncBar();
        raf=requestAnimationFrame(()=>{
          if(!active)return;
          target=playerAnchor();
          if(Math.abs(viewport.scrollTop-target)>.5)viewport.scrollTop=target;
          syncBar();
          /* Reveal Full Board only now. Removing this one class atomically hides
             Your Side and reveals the already-positioned Full Board. */
          active=false;
          document.body.classList.remove('h226-stage-your-to-full');
        });
      });
    };

    fullTab.addEventListener('pointerdown',prepare,true);
    fullTab.addEventListener('touchstart',prepare,{capture:true,passive:true});
    fullTab.addEventListener('click',()=>{
      if(!active)return;
      cancelAnimationFrame(raf);raf=requestAnimationFrame(settle);
    });
    fullTab.addEventListener('pointercancel',cancel,true);
    document.querySelectorAll('[data-v="you"],[data-v="opp"]').forEach(btn=>btn.addEventListener('pointerdown',()=>{if(active)cancel()},true));
    window.addEventListener('blur',cancel);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h225.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
