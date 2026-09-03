import h180 from './worker-h180.js';

const BUILD='H181';
const DIVIDER=58;
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h181-fullboard-space-turn-labels'))return out;

  const css=`<style id="h181-fullboard-space-turn-labels-style">
/* H181: Full Board is the only view, so the old view-selector row is removed.
   Keep it in layout until JS measures the exact reclaimed height, then collapse it. */
body:not(.h181-ready)>.bar{visibility:hidden!important}
body.h181-ready>.bar{display:none!important}

/* JS sets the new board height to old board height + the exact removed row height.
   This gives BOTH player boards the same additional blank battlefield space. */
body.h181-ready #board{
  height:var(--h181-board-h)!important;
  min-height:var(--h181-board-h)!important;
}
body.h181-ready #h105fullviewport{height:100%!important}
body.h181-ready #h105fullcontent{
  height:calc((var(--h181-board-h) * 2) + ${DIVIDER}px)!important;
  min-height:calc((var(--h181-board-h) * 2) + ${DIVIDER}px)!important;
  max-height:calc((var(--h181-board-h) * 2) + ${DIVIDER}px)!important;
  --h176-board-h:var(--h181-board-h)!important;
}
body.h181-ready #h105fullcontent #fullcards,
body.h181-ready #h116-piles-opp,
body.h181-ready #h116-piles-you{
  height:calc(var(--h181-board-h) * 2)!important;
  min-height:calc(var(--h181-board-h) * 2)!important;
  max-height:calc(var(--h181-board-h) * 2)!important;
}

/* Land-zone size is intentionally frozen to its pre-expansion pixel height.
   Only surrounding blank battlefield space grows. */
body.h181-ready #h105fullcontent .h133-land-zone{
  height:var(--h181-land-h)!important;
}

/* Pile labels are neutral when that player is not active. */
#h116-piles-opp .zone::after,#h116-piles-opp .cmd::after,
#h116-piles-you .zone::after,#h116-piles-you .cmd::after{
  color:rgba(190,194,198,.82)!important;
  transition:color .12s linear!important;
}
/* Opponent/red turn. */
#h105fullcontent.h181-turn-opp #h116-piles-opp .zone::after,
#h105fullcontent.h181-turn-opp #h116-piles-opp .cmd::after{
  color:#ef6666!important;
}
/* Your/blue turn. */
#h105fullcontent.h181-turn-you #h116-piles-you .zone::after,
#h105fullcontent.h181-turn-you #h116-piles-you .cmd::after{
  color:#72adff!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h181-fullboard-space-turn-labels">window.addEventListener('DOMContentLoaded',()=>{
    const body=document.body;
    const topbar=document.querySelector('body>.bar');
    const board=document.getElementById('board');
    const viewport=document.getElementById('h105fullviewport');
    const content=document.getElementById('h105fullcontent');
    const divider=document.getElementById('h105divider');
    if(!body||!board||!viewport||!content)return;

    /* Measure BEFORE collapsing the top row. This keeps the expansion exact on
       different iPhones/orientations instead of hard-coding a guessed height. */
    const oldBoardH=Math.max(1,board.getBoundingClientRect().height);
    const barRect=topbar?.getBoundingClientRect();
    const barStyle=topbar?getComputedStyle(topbar):null;
    const reclaimed=Math.max(0,(barRect?.height||0)+(parseFloat(barStyle?.marginTop)||0)+(parseFloat(barStyle?.marginBottom)||0));
    const newBoardH=oldBoardH+reclaimed;

    /* Freeze the current real land-zone height before the board grows. */
    const landSample=content.querySelector('.h133-land-zone');
    const oldLandH=Math.max(1,landSample?.getBoundingClientRect().height||oldBoardH*.27);
    body.style.setProperty('--h181-board-h',newBoardH+'px');
    body.style.setProperty('--h181-land-h',oldLandH+'px');
    content.style.setProperty('--h181-board-h',newBoardH+'px');
    content.style.setProperty('--h176-board-h',newBoardH+'px');
    body.classList.add('h181-ready');

    /* H133 recalculates land geometry from board percentages. Re-place each land
       zone after expansion while preserving its old pixel height: opponent keeps
       the same 2% top inset, player keeps the same 5% bottom inset. */
    const positionLandZones=()=>{
      const h=Math.max(1,viewport.clientHeight);
      const landH=oldLandH;
      const opp=content.querySelector('.h133-land-opp');
      const you=content.querySelector('.h133-land-you');
      if(opp){opp.style.setProperty('top',(h*.02)+'px','important');opp.style.setProperty('height',landH+'px','important')}
      if(you){const top=h+${DIVIDER}+h-landH-h*.05;you.style.setProperty('top',top+'px','important');you.style.setProperty('height',landH+'px','important')}
    };

    /* Match label ownership to the match divider's actual turn state. */
    const syncTurn=()=>{
      const turn=divider?.dataset.turn==='opp'?'opp':'you';
      content.classList.toggle('h181-turn-opp',turn==='opp');
      content.classList.toggle('h181-turn-you',turn==='you');
    };
    if(divider)new MutationObserver(syncTurn).observe(divider,{attributes:true,attributeFilter:['data-turn']});

    const relayout=()=>requestAnimationFrame(()=>{
      /* H176 expects the scroll viewport height to define one battlefield. */
      const h=Math.max(1,viewport.clientHeight);
      body.style.setProperty('--h181-board-h',h+'px');
      content.style.setProperty('--h181-board-h',h+'px');
      content.style.setProperty('--h176-board-h',h+'px');
      positionLandZones();syncTurn();
      window.MTG_H168_manaLifecycle?.render?.();
    });

    positionLandZones();syncTurn();
    new ResizeObserver(relayout).observe(board);
    window.addEventListener('orientationchange',()=>setTimeout(relayout,100),{passive:true});
    window.addEventListener('pageshow',relayout);
    setTimeout(relayout,100);
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
