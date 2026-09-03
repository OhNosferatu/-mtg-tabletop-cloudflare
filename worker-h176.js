import h173 from './worker-h173.js';

const BUILD='H176';
const DIVIDER=58;
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h176-exact-fullboard-bounds'))return out;

  const css=`<style id="h176-exact-fullboard-bounds">
/* H176: bypass H174/H175. The actual H105 scroll viewport is the scroll owner.
   Full Board is exactly: one opponent viewport + 58px divider + one player viewport. */
#full{overflow:hidden!important}
#h105fullviewport{
  position:absolute!important;
  inset:0!important;
  overflow-x:hidden!important;
  overflow-y:auto!important;
  overscroll-behavior-y:none!important;
  -webkit-overflow-scrolling:touch!important;
  overflow-anchor:none!important;
  scrollbar-width:none!important;
}
#h105fullviewport::-webkit-scrollbar{display:none!important}
#h105fullcontent{
  position:relative!important;
  width:100%!important;
  height:calc((var(--h176-board-h,610px) * 2) + ${DIVIDER}px)!important;
  min-height:calc((var(--h176-board-h,610px) * 2) + ${DIVIDER}px)!important;
  max-height:calc((var(--h176-board-h,610px) * 2) + ${DIVIDER}px)!important;
  overflow:hidden!important;
}
/* H133's card/pile coordinate layer is exactly two boards high; the divider is
   outside that coordinate space and the player layer translates past it. */
#h105fullcontent #fullcards,
#h116-piles-opp,#h116-piles-you{
  height:calc(var(--h176-board-h,610px) * 2)!important;
  min-height:calc(var(--h176-board-h,610px) * 2)!important;
  max-height:calc(var(--h176-board-h,610px) * 2)!important;
}
/* Quiet boundary rules only at the true start/end of each board. */
#h105fullcontent::before,#h105fullcontent::after{
  content:''!important;
  display:block!important;
  position:absolute!important;
  left:0!important;right:0!important;
  height:1px!important;
  background:rgba(201,166,107,.34)!important;
  z-index:120!important;
  pointer-events:none!important;
}
#h105fullcontent::before{top:var(--h176-board-h,610px)!important}
#h105fullcontent::after{bottom:0!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h176-exact-fullboard-bounds">window.addEventListener('DOMContentLoaded',()=>{
    const viewport=document.getElementById('h105fullviewport');
    const content=document.getElementById('h105fullcontent');
    if(!viewport||!content)return;

    let boardH=0,raf=0;
    const maxScroll=()=>Math.max(0,content.scrollHeight-viewport.clientHeight);
    const clamp=()=>{
      const max=maxScroll();
      if(viewport.scrollTop<0)viewport.scrollTop=0;
      else if(viewport.scrollTop>max)viewport.scrollTop=max;
      const bar=document.getElementById('h105fullscroll');
      if(bar){bar.max=String(Math.max(1,Math.round(max)));bar.value=String(Math.min(max,Math.max(0,Math.round(viewport.scrollTop))));bar.disabled=max<=1}
    };
    const layout=()=>{
      cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
        const h=Math.max(1,viewport.clientHeight);
        if(Math.abs(h-boardH)>.5){boardH=h;content.style.setProperty('--h176-board-h',h+'px')}
        clamp();
        window.MTG_H168_manaLifecycle?.render?.();
      });
    };

    /* H105 historically centered the old oversized canvas when Full Board was
       opened. Override that after its handler: start at the exact opponent-board
       top instead of an arbitrary middle position. */
    document.querySelectorAll('[data-v="full"]').forEach(btn=>btn.addEventListener('click',()=>{
      requestAnimationFrame(()=>requestAnimationFrame(()=>{layout();viewport.scrollTop=0;clamp()}));
    }));
    viewport.addEventListener('scroll',clamp,{passive:true});
    window.addEventListener('resize',layout,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(layout,80),{passive:true});
    window.addEventListener('pageshow',layout);
    new ResizeObserver(layout).observe(viewport);
    layout();setTimeout(layout,100);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h173.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
