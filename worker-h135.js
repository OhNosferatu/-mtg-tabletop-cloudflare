import h134 from './worker-h134.js';

const BUILD='H135';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h135-hand-count-sync'))return out;

  const script=`<script id="h135-hand-count-sync">window.addEventListener('DOMContentLoaded',()=>{
    const install=()=>{
      const divider=document.getElementById('h105divider');
      const handrow=document.getElementById('handrow');
      if(!divider||!handrow||!divider.dataset.h134Ready){requestAnimationFrame(install);return}
      if(divider.dataset.h135Ready)return;
      divider.dataset.h135Ready='1';

      const dstYou=()=>divider.querySelector('[data-h134-hand="you"]');
      const dstOpp=()=>divider.querySelector('[data-h134-hand="opp"]');
      const ownCount=()=>[...handrow.children].filter(el=>el.classList?.contains('hcard')&&!el.classList.contains('hand-placeholder')).length;
      const oppCount=()=>{
        const src=document.querySelector('#h117-hand-opp b');
        const n=parseInt(src?.textContent||'0',10);
        return Number.isFinite(n)?n:0;
      };
      const sync=()=>{
        const y=dstYou(),o=dstOpp();
        if(y)y.textContent=String(ownCount());
        if(o)o.textContent=String(oppCount());
      };

      new MutationObserver(sync).observe(handrow,{childList:true,subtree:true});
      const oppChip=document.getElementById('h117-hand-opp');
      if(oppChip)new MutationObserver(sync).observe(oppChip,{childList:true,subtree:true,characterData:true});
      const full=document.getElementById('h105fullcontent');
      if(full)new MutationObserver(sync).observe(full,{childList:true,subtree:true,characterData:true});
      document.addEventListener('pointerup',()=>requestAnimationFrame(sync),true);
      document.addEventListener('click',()=>requestAnimationFrame(sync),true);
      window.addEventListener('pageshow',sync);
      sync();setTimeout(sync,80);setTimeout(sync,300);
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
