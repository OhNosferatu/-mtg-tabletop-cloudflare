import h134 from './worker-h134.js';

const BUILD='H136';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h136-safe-hand-count-sync'))return out;

  const script=`<script id="h136-safe-hand-count-sync">window.addEventListener('DOMContentLoaded',()=>{
    const install=()=>{
      const divider=document.getElementById('h105divider');
      const handrow=document.getElementById('handrow');
      if(!divider||!handrow||!divider.dataset.h134Ready){requestAnimationFrame(install);return}
      if(divider.dataset.h136Ready)return;
      divider.dataset.h136Ready='1';

      const setCount=(side,value)=>{
        const el=divider.querySelector('[data-h134-hand="'+side+'"]');
        const next=String(Math.max(0,Number(value)||0));
        if(el&&el.textContent!==next)el.textContent=next;
      };
      const ownCount=()=>handrow.querySelectorAll(':scope > .hcard:not(.hand-placeholder)').length;
      const oppCount=()=>{
        const src=document.querySelector('#h117-hand-opp b');
        const n=parseInt(src?.textContent||'0',10);
        return Number.isFinite(n)?n:0;
      };
      const sync=()=>{setCount('you',ownCount());setCount('opp',oppCount())};

      /* Observe only the actual hand row. H135 observed the entire Full Board
         while also writing into it, which could retrigger itself continuously. */
      new MutationObserver(()=>requestAnimationFrame(sync)).observe(handrow,{childList:true});
      window.addEventListener('pageshow',sync);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
      sync();
      setInterval(sync,250);
    };
    install();
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h134.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
