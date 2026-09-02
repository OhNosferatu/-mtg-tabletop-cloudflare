import h126 from './worker-h126.js';

const BUILD='H127';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replaceAll('H126','H127');
  if(out.includes('h127-counter-font-sync'))return out;

  const script=`<script id="h127-counter-font-sync">window.addEventListener('DOMContentLoaded',()=>{
    let queued=false;
    const sync=()=>{
      queued=false;
      const fullBadges=[...document.querySelectorAll('#fullcards .card[data-id] .badge.counter-total')];
      if(!fullBadges.length)return;
      const byId=new Map();
      for(const badge of fullBadges){
        const card=badge.closest('.card[data-id]');
        if(card&&!byId.has(card.dataset.id))byId.set(card.dataset.id,badge);
      }
      for(const rootSel of ['#field','#oppcards']){
        for(const card of document.querySelectorAll(rootSel+' .card[data-id]')){
          const badge=card.querySelector('.badge.counter-total');
          const sourceBadge=byId.get(card.dataset.id);
          if(!badge||!sourceBadge)continue;
          const cs=getComputedStyle(sourceBadge);
          badge.style.setProperty('font-size',cs.fontSize,'important');
          badge.style.setProperty('line-height',cs.lineHeight,'important');
          badge.style.setProperty('font-weight',cs.fontWeight,'important');
        }
      }
    };
    const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(sync)};
    for(const id of ['field','oppcards','fullcards']){
      const root=document.getElementById(id);
      if(root)new MutationObserver(queue).observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','style']});
    }
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-v]'))setTimeout(queue,0)},true);
    queue();setTimeout(queue,120);setTimeout(queue,500);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h126.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
