import h223 from './worker-h223.js';

const BUILD='H224';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h224-fullboard-stable-reveal'))return out;

  const css=`<style id="h224-fullboard-stable-reveal-style">
/* Video review showed the remaining "jitter" is a transient paint: Full Board
   briefly becomes visible while its saved scroll position / view classes are
   still settling. Keep H222/H223 geometry exactly as-is, but do not reveal the
   Full Board viewport until its scrollTop has been stable for two paint frames. */
body.h224-full-entering #full.on #h105fullviewport,
body.h224-full-entering #full.on #h105fullscroll{
  visibility:hidden!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h224-fullboard-stable-reveal">window.addEventListener('DOMContentLoaded',()=>{
    const fullTab=document.querySelector('[data-v="full"]');
    const full=document.getElementById('full');
    const viewport=document.getElementById('h105fullviewport');
    const content=document.getElementById('h105fullcontent');
    if(!fullTab||!full||!viewport||!content)return;

    let raf=0,stableFrames=0,startedAt=0,target=0;
    const maxScroll=()=>Math.max(0,content.scrollHeight-viewport.clientHeight);
    const readSaved=()=>{
      let y=viewport.scrollTop;
      try{
        const v=Number(sessionStorage.getItem('mtg_full_scroll_v2'));
        if(Number.isFinite(v))y=v;
      }catch{}
      return Math.max(0,Math.min(maxScroll(),y||0));
    };
    const syncBar=()=>{
      const bar=document.getElementById('h105fullscroll');
      if(bar)bar.value=String(Math.round(viewport.scrollTop));
    };
    const clear=()=>{
      cancelAnimationFrame(raf);raf=0;stableFrames=0;
      document.body.classList.remove('h224-full-entering');
    };
    const settle=()=>{
      /* Wait until the normal screen-switch code has actually activated #full.
         H222 still does its short hidden prewarm, but H224 controls the first
         visible paint. */
      if(!fullTab.classList.contains('on')||!full.classList.contains('on')){
        if(performance.now()-startedAt<300){raf=requestAnimationFrame(settle);return}
        clear();return;
      }

      const max=maxScroll();
      target=Math.max(0,Math.min(max,target));
      if(Math.abs(viewport.scrollTop-target)>.5)viewport.scrollTop=target;
      syncBar();

      raf=requestAnimationFrame(()=>{
        const delta=Math.abs(viewport.scrollTop-target);
        if(delta<=.5)stableFrames++;else stableFrames=0;
        if(stableFrames>=2||performance.now()-startedAt>220){
          /* Reveal only after the correct saved position has survived two paints.
             No card, pile, land-zone, or board dimensions are changed. */
          clear();
          return;
        }
        settle();
      });
    };
    const begin=()=>{
      clear();
      target=readSaved();
      startedAt=performance.now();
      document.body.classList.add('h224-full-entering');
    };

    /* Start the visual gate before H222's prewarm can ever be painted. */
    fullTab.addEventListener('pointerdown',begin,true);
    fullTab.addEventListener('touchstart',begin,{capture:true,passive:true});
    fullTab.addEventListener('click',()=>{
      if(!document.body.classList.contains('h224-full-entering'))begin();
      cancelAnimationFrame(raf);raf=requestAnimationFrame(settle);
    });
    fullTab.addEventListener('pointercancel',clear,true);
    document.querySelectorAll('[data-v="you"],[data-v="opp"]').forEach(btn=>btn.addEventListener('pointerdown',clear,true));
    window.addEventListener('blur',clear);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h223.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
