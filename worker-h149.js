import h147 from './worker-h147.js';

const BUILD='H149';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h149-safe-empty-deck-sync'))return out;

  const css=`<style id="h149-safe-empty-deck-sync">
#h105fullcontent .deck.h149-empty-deck::before,
#h105fullcontent .h116-deck.h149-empty-deck::before{
  display:none!important;
  content:none!important;
  background:none!important;
}
#h105fullcontent .deck.h149-empty-deck>img,
#h105fullcontent .h116-deck.h149-empty-deck>img{display:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h149-safe-empty-deck-sync-script">window.addEventListener('DOMContentLoaded',()=>{
    const sourceDeck=document.getElementById('deck');
    const content=document.getElementById('h105fullcontent');
    if(!sourceDeck||!content)return;

    const mark=deck=>{
      const count=parseInt(deck.querySelector('.count')?.textContent||'0',10);
      const empty=!Number.isFinite(count)||count<=0;
      deck.classList.toggle('h149-empty-deck',empty);
      if(empty)deck.querySelectorAll(':scope > img').forEach(img=>img.remove());
    };

    const sync=()=>{
      content.querySelectorAll('#h116-piles-you .deck,#h116-piles-opp .deck,.h116-deck').forEach(mark);
    };

    let raf=0;
    const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(sync)};
    new MutationObserver(schedule).observe(sourceDeck,{childList:true,subtree:true,characterData:true});
    document.querySelectorAll('[data-v="full"]').forEach(btn=>btn.addEventListener('click',()=>requestAnimationFrame(sync)));
    window.addEventListener('pageshow',sync);
    sync();
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h147.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
