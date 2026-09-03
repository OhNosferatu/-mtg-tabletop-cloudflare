import h173 from './worker-h173.js';

const BUILD='H174';
const DIVIDER=58;
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h174-fixed-board-bounds'))return out;

  const css=`<style id="h174-fixed-board-bounds">
/* H174: Full Board is exactly opponent board + divider + your board.
   No extra canvas exists above or below those fixed battlefield bounds. */
#full{
  overflow-x:hidden!important;
  overflow-y:auto!important;
  overscroll-behavior-y:none!important;
  -webkit-overflow-scrolling:touch!important;
  overflow-anchor:none!important;
}
#h105fullcontent{
  height:calc((var(--h174-board-h, 610px) * 2) + ${DIVIDER}px)!important;
  min-height:calc((var(--h174-board-h, 610px) * 2) + ${DIVIDER}px)!important;
  max-height:calc((var(--h174-board-h, 610px) * 2) + ${DIVIDER}px)!important;
}
#h105fullcontent #fullcards,
#h116-piles-opp,#h116-piles-you{
  height:calc(var(--h174-board-h, 610px) * 2)!important;
  min-height:calc(var(--h174-board-h, 610px) * 2)!important;
  max-height:calc(var(--h174-board-h, 610px) * 2)!important;
}
/* Dedicated screens remain one exact board and never gain their own vertical canvas. */
#you,#opp{overflow:hidden!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h174-fixed-board-bounds">window.addEventListener('DOMContentLoaded',()=>{
    const board=document.getElementById('board');
    const full=document.getElementById('full');
    const content=document.getElementById('h105fullcontent');
    if(!board||!full||!content)return;

    let previousH=0;
    const clamp=()=>{
      const max=Math.max(0,content.scrollHeight-full.clientHeight);
      if(full.scrollTop<0)full.scrollTop=0;
      else if(full.scrollTop>max)full.scrollTop=max;
    };
    const layout=()=>{
      const h=Math.max(1,board.clientHeight);
      if(Math.abs(h-previousH)>.5){
        previousH=h;
        content.style.setProperty('--h174-board-h',h+'px');
      }
      requestAnimationFrame(()=>{
        clamp();
        window.MTG_H168_manaLifecycle?.render?.();
      });
    };

    full.addEventListener('scroll',clamp,{passive:true});
    new ResizeObserver(layout).observe(board);
    window.addEventListener('orientationchange',()=>setTimeout(layout,80),{passive:true});
    window.addEventListener('pageshow',layout);
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>requestAnimationFrame(layout)));
    layout();setTimeout(layout,80);
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
