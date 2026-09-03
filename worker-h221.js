import h217 from './worker-h217.js';

const BUILD='H221';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h221-fullboard-native-scroll-preservation'))return out;

  /* Return to the confirmed H217 gameplay/layout baseline and remove every
     programmatic Full Board opening move. H105 centered it, H176 sent it to the
     top, and H178 restored it later. Even when they ended at the right place,
     Safari could paint one of the intermediate positions and create the jitter. */
  out=out.replace(
    "if(btn.dataset.v==='full')centerBoard();",
    "if(btn.dataset.v==='full')syncBar();/* h221-fullboard-native-scroll-preservation */"
  );
  out=out.replace(
    "requestAnimationFrame(()=>requestAnimationFrame(()=>{layout();viewport.scrollTop=0;clamp()}));",
    "requestAnimationFrame(()=>requestAnimationFrame(()=>{layout();clamp()}));/* h221-fullboard-native-scroll-preservation */"
  );

  const oldRestore=`fullTab?.addEventListener('click',()=>{
      openingFull=true;
      const wanted=savedScroll;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        savedScroll=wanted;restoreScroll();
        setTimeout(()=>{savedScroll=wanted;restoreScroll()},90);
      }));
    },true);`;
  const newRestore=`fullTab?.addEventListener('click',()=>{
      /* h221-fullboard-native-scroll-preservation
         Full Board remains laid out while inactive, so its real scrollTop never
         collapses. Do not write scrollTop at all when reopening it. */
      openingFull=false;
      requestAnimationFrame(()=>{alignOpponentCards();
        const bar=document.getElementById('h105fullscroll');
        if(bar)bar.value=String(Math.round(viewport.scrollTop));
      });
    },true);`;
  out=out.replace(oldRestore,newRestore);

  const css=`<style id="h221-fullboard-native-scroll-preservation-style">
/* Keep Full Board in layout even while another screen is selected. Hiding it
   with visibility rather than display:none preserves Safari's actual scrollTop
   and scroll geometry. It remains completely invisible and non-interactive. */
#full.screen{
  display:block!important;
  visibility:hidden!important;
  pointer-events:none!important;
}
#full.screen.on{
  visibility:visible!important;
  pointer-events:auto!important;
}

/* H197 hid the Full Board for 115ms while the old competing scroll writes
   settled. Those writes no longer exist, so remove that artificial transition
   delay as well. The inactive #full parent still keeps the board hidden. */
body.h197-full-settling #full.on #h105fullviewport,
body.h197-full-settling #full.on #h105fullscroll{
  visibility:visible!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h221-fullboard-native-scroll-preservation">window.addEventListener('DOMContentLoaded',()=>{
    const viewport=document.getElementById('h105fullviewport');
    const content=document.getElementById('h105fullcontent');
    if(!viewport||!content)return;

    /* Restore a saved position once per page load while Full Board is already
       laid out (but usually hidden). After that, tab changes never touch
       scrollTop; the browser simply preserves the user's real position. */
    let initial=0;
    try{initial=Math.max(0,Number(sessionStorage.getItem('mtg_full_scroll_v2'))||0)}catch{}
    const applyInitial=()=>{
      const max=Math.max(0,content.scrollHeight-viewport.clientHeight);
      if(max<=0)return false;
      viewport.scrollTop=Math.max(0,Math.min(max,initial));
      const bar=document.getElementById('h105fullscroll');
      if(bar)bar.value=String(Math.round(viewport.scrollTop));
      return true;
    };
    requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!applyInitial())setTimeout(applyInitial,80)}));
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
