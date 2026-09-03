import h180 from './worker-h180.js';

const BUILD='H182';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h182-stable-fullboard-only'))return out;

  const css=`<style id="h182-stable-fullboard-only-style">
/* H182: stable full-board-only layout. H181 is deliberately bypassed. */
body.h182-ready>.bar{display:none!important}
.tools{
  display:grid!important;
  visibility:visible!important;
  opacity:1!important;
  position:relative!important;
  z-index:42!important;
}
#board{transition:none!important}

/* Neutral pile labels by default. */
#h116-piles-opp .zone::after,#h116-piles-opp .cmd::after,
#h116-piles-you .zone::after,#h116-piles-you .cmd::after{
  color:rgba(190,194,198,.82)!important;
  transition:none!important;
}
/* Red/opponent turn. */
#h105fullcontent.h182-turn-opp #h116-piles-opp .zone::after,
#h105fullcontent.h182-turn-opp #h116-piles-opp .cmd::after{color:#ef6666!important}
/* Blue/your turn. */
#h105fullcontent.h182-turn-you #h116-piles-you .zone::after,
#h105fullcontent.h182-turn-you #h116-piles-you .cmd::after{color:#72adff!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h182-stable-fullboard-only">window.addEventListener('DOMContentLoaded',()=>{
    const body=document.body;
    const bar=document.querySelector('body>.bar');
    const tools=document.querySelector('.tools');
    const board=document.getElementById('board');
    const content=document.getElementById('h105fullcontent');
    const divider=document.getElementById('h105divider');
    if(!body||!board||!content)return;

    /* Measure once, then remove the obsolete Full Board tab row. No ResizeObserver,
       no feedback loop, and no repeated board-height rewrites. */
    const oldBoardH=Math.max(1,board.getBoundingClientRect().height);
    let reclaimed=0;
    if(bar){
      const r=bar.getBoundingClientRect(),s=getComputedStyle(bar);
      reclaimed=Math.max(0,r.height+(parseFloat(s.marginTop)||0)+(parseFloat(s.marginBottom)||0));
    }
    const oldLand=content.querySelector('.h133-land-zone');
    const landH=oldLand?oldLand.getBoundingClientRect().height:0;
    const newBoardH=oldBoardH+reclaimed;
    board.style.setProperty('height',newBoardH+'px','important');
    board.style.setProperty('min-height',newBoardH+'px','important');
    body.classList.add('h182-ready');

    /* Keep the action row explicitly available after the top tab row disappears. */
    if(tools){tools.style.setProperty('display','grid','important');tools.style.setProperty('visibility','visible','important')}

    /* H176 will derive the exact two-board Full Board canvas from the viewport.
       Once that settles, restore the original physical land-zone heights only. */
    const restoreLandSize=()=>{
      if(!(landH>0))return;
      content.querySelectorAll('.h133-land-zone').forEach(el=>el.style.setProperty('height',landH+'px','important'));
    };

    const syncTurn=()=>{
      const turn=divider?.dataset.turn==='opp'?'opp':'you';
      content.classList.toggle('h182-turn-opp',turn==='opp');
      content.classList.toggle('h182-turn-you',turn==='you');
    };
    if(divider)new MutationObserver(syncTurn).observe(divider,{attributes:true,attributeFilter:['data-turn']});

    syncTurn();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{restoreLandSize();window.MTG_H168_manaLifecycle?.render?.()}));
    setTimeout(()=>{restoreLandSize();syncTurn()},120);
    window.addEventListener('pageshow',()=>{restoreLandSize();syncTurn()});
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h180.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
