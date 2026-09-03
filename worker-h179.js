import h178 from './worker-h178.js';

const BUILD='H179';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h179-full-board-only'))return out;

  const css=`<style id="h179-full-board-only-style">
/* H179 experiment: one-table UI. Remove side-view navigation entirely and keep
   Full Board as the only battlefield screen. */
.tabs [data-v="you"],.tabs [data-v="opp"]{display:none!important}
.tabs [data-v="full"]{display:flex!important;flex:1 1 100%!important;align-items:center!important;justify-content:center!important}
#you,#opp{display:none!important}
#full{display:block!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h179-full-board-only">window.addEventListener('DOMContentLoaded',()=>{
    const fullTab=document.querySelector('[data-v="full"]');
    const youTab=document.querySelector('[data-v="you"]');
    const oppTab=document.querySelector('[data-v="opp"]');
    const full=document.getElementById('full');
    const you=document.getElementById('you');
    const opp=document.getElementById('opp');

    const forceFull=()=>{
      youTab?.classList.remove('on');oppTab?.classList.remove('on');fullTab?.classList.add('on');
      you?.classList.remove('on');opp?.classList.remove('on');full?.classList.add('on');
      document.body.classList.remove('h157-opp-mode');
      requestAnimationFrame(()=>window.MTG_H168_manaLifecycle?.render?.());
    };

    /* Trigger the game's established Full Board setup once so all existing
       card/pile/gesture layers initialize normally, then lock the UI to it. */
    if(fullTab&&!fullTab.classList.contains('on'))fullTab.click();
    requestAnimationFrame(()=>requestAnimationFrame(forceFull));
    setTimeout(forceFull,100);
    window.addEventListener('pageshow',forceFull);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h178.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
