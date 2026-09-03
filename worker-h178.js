import h176 from './worker-h176.js';

const BUILD='H178';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h178-board-consistency'))return out;

  const css=`<style id="h178-board-consistency-style">
/* H178 uses H176 as the bounded Full Board baseline and fixes the remaining
   presentation mismatches without changing the established gesture system. */

/* Canonical Your Side pile order: Commander -> Exile -> Deck -> Graveyard -> Tokens. */
#you #cmds{top:13.5%!important}
#you #exile{top:30%!important}
#you #deck{top:46.5%!important}
#you #graveyard{top:63%!important}
#you #tokens{top:79.5%!important}

/* One exact label treatment for every public pile on all three board views. */
body .zone::after,body .cmd::after{
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;
  font-size:7px!important;
  font-weight:900!important;
  line-height:1!important;
  letter-spacing:.08em!important;
  color:rgba(224,228,232,.88)!important;
  text-transform:uppercase!important;
  bottom:-14px!important;
  opacity:1!important;
  white-space:nowrap!important;
  text-shadow:none!important;
}

/* Full Board opponent cards are explicitly anchored to the one-board opponent
   plane. Runtime sets top/left after every card render. */
#fullcards .h117-full-card[data-h117-owner="opp"]{transform-origin:top left!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h178-board-consistency">window.addEventListener('DOMContentLoaded',()=>{
    const viewport=document.getElementById('h105fullviewport');
    const content=document.getElementById('h105fullcontent');
    const fullcards=document.getElementById('fullcards');
    const board=document.getElementById('board');
    if(!viewport||!content||!fullcards||!board)return;

    /* ---------- 1) Exact opponent-card visual plane ----------
       #oppcards is the dedicated Opponent screen's source of truth. cardEl stores
       each battlefield coordinate directly as left/top percentages there. Copy
       those exact percentages into the upper one-board Full Board plane instead
       of allowing the old two-board percentage mapping to affect them. */
    let alignRaf=0;
    const percentFromStyle=(value)=>{const m=String(value||'').trim().match(/^(-?\\d+(?:\\.\\d+)?)%$/);return m?Number(m[1]):null};
    const alignOpponentCards=()=>{
      cancelAnimationFrame(alignRaf);alignRaf=requestAnimationFrame(()=>{
        const boardH=viewport.clientHeight;
        const contentW=content.clientWidth;
        if(!boardH||!contentW)return;
        fullcards.querySelectorAll('.h117-full-card[data-h117-owner="opp"][data-id]').forEach(dst=>{
          const id=dst.dataset.id;
          const src=document.querySelector('#oppcards .card[data-id="'+CSS.escape(id)+'"]');
          if(!src)return;
          let x=percentFromStyle(src.style.left),y=percentFromStyle(src.style.top);
          if(x===null||y===null){
            const sr=src.getBoundingClientRect(),br=board.getBoundingClientRect();
            if(br.width&&br.height&&sr.width){x=(sr.left-br.left)/br.width*100;y=(sr.top-br.top)/br.height*100}
          }
          if(x===null||y===null)return;
          dst.style.setProperty('left',(x/100*contentW)+'px','important');
          dst.style.setProperty('top',(y/100*boardH)+'px','important');
          /* Match the dedicated battlefield card dimensions as well. */
          const sw=parseFloat(getComputedStyle(src).width);
          if(Number.isFinite(sw)&&sw>0)dst.style.setProperty('width',sw+'px','important');
        });
      });
    };
    new MutationObserver(alignOpponentCards).observe(fullcards,{childList:true});

    /* ---------- 2) Real Full Board scroll-position memory ----------
       H105 and H176 both contain legacy "open Full Board" scroll handlers. They
       run during the same click and can emit scroll events at 0. Capture the
       desired position BEFORE that click, ignore those programmatic events, then
       restore after all older handlers have completed. */
    let savedScroll=0,openingFull=false,userScrolling=false,scrollEndTimer=0;
    try{savedScroll=Math.max(0,Number(sessionStorage.getItem('mtg_full_scroll_v2'))||0)}catch{}
    const maxScroll=()=>Math.max(0,content.scrollHeight-viewport.clientHeight);
    const persist=()=>{savedScroll=Math.max(0,Math.min(maxScroll(),viewport.scrollTop));try{sessionStorage.setItem('mtg_full_scroll_v2',String(savedScroll))}catch{}};
    const restoreScroll=()=>{
      const y=Math.max(0,Math.min(maxScroll(),savedScroll));
      openingFull=true;viewport.scrollTop=y;
      const bar=document.getElementById('h105fullscroll');if(bar)bar.value=String(Math.round(y));
      requestAnimationFrame(()=>requestAnimationFrame(()=>{openingFull=false;alignOpponentCards()}));
    };
    viewport.addEventListener('pointerdown',()=>{userScrolling=true},{passive:true});
    viewport.addEventListener('touchstart',()=>{userScrolling=true},{passive:true});
    viewport.addEventListener('wheel',()=>{userScrolling=true},{passive:true});
    viewport.addEventListener('scroll',()=>{
      if(openingFull)return;
      clearTimeout(scrollEndTimer);
      if(document.querySelector('[data-v="full"]')?.classList.contains('on'))persist();
      scrollEndTimer=setTimeout(()=>{userScrolling=false},140);
    },{passive:true});

    const fullTab=document.querySelector('[data-v="full"]');
    /* Capture phase runs before the older H105/H176 click listeners. */
    fullTab?.addEventListener('click',()=>{
      openingFull=true;
      const wanted=savedScroll;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        savedScroll=wanted;restoreScroll();
        setTimeout(()=>{savedScroll=wanted;restoreScroll()},90);
      }));
    },true);
    document.querySelectorAll('[data-v="you"],[data-v="opp"]').forEach(btn=>btn.addEventListener('click',()=>{if(!openingFull)persist()},true));

    /* ---------- 3) Canonical pile order, enforced on actual DOM nodes ---------- */
    const enforcePileOrder=()=>{
      const set=(id,top)=>{const el=document.getElementById(id);if(el)el.style.setProperty('top',top,'important')};
      set('cmds','13.5%');set('exile','30%');set('deck','46.5%');set('graveyard','63%');set('tokens','79.5%');
      document.querySelectorAll('.graveyard').forEach(el=>{el.dataset.name='GRAVEYARD'});
    };

    const syncAll=()=>{enforcePileOrder();alignOpponentCards();if(document.querySelector('[data-v="full"]')?.classList.contains('on')&&!openingFull)requestAnimationFrame(alignOpponentCards)};
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>requestAnimationFrame(syncAll)));
    window.addEventListener('resize',syncAll,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(syncAll,80),{passive:true});
    window.addEventListener('pageshow',()=>setTimeout(syncAll,50));
    syncAll();setTimeout(syncAll,100);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h176.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
