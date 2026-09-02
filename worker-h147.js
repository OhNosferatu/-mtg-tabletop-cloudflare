import h146 from './worker-h146.js';

const BUILD='H147';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h147-authoritative-hand-count'))return out;

  const script=`<script id="h147-authoritative-hand-count">window.addEventListener('DOMContentLoaded',()=>{
    const install=()=>{
      const handrow=document.getElementById('handrow');
      const divider=document.getElementById('h105divider');
      if(!handrow||!divider||!divider.dataset.h134Ready){requestAnimationFrame(install);return}
      if(handrow.dataset.h147Ready)return;
      handrow.dataset.h147Ready='1';

      const countHand=()=>{
        const seen=new Set();
        handrow.querySelectorAll(':scope > .hcard[data-id]').forEach(el=>{
          if(!el.classList.contains('hand-placeholder')&&el.dataset.id)seen.add(el.dataset.id);
        });
        return seen.size;
      };

      const sync=()=>{
        const value=String(countHand());
        /* H134 still periodically mirrors its hidden H117 source into the divider.
           Keep that source authoritative too, so both old and new sync paths agree
           instead of fighting each other. */
        const source=document.querySelector('#h117-hand-you b');
        const display=divider.querySelector('[data-h134-hand="you"]');
        if(source&&source.textContent!==value)source.textContent=value;
        if(display&&display.textContent!==value)display.textContent=value;
      };

      let raf=0;
      const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(sync)};
      new MutationObserver(schedule).observe(handrow,{childList:true});
      window.addEventListener('pageshow',sync);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
      sync();
      setInterval(sync,200);
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
    const response=await h146.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
