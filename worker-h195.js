import h193 from './worker-h193.js';

const BUILD='H195';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h195-view-only-stability'))return out;

  const script=`<script id="h195-view-only-stability">window.addEventListener('DOMContentLoaded',()=>{
    const tabs=[...document.querySelectorAll('.tabs [data-v]')];
    if(!tabs.length)return;

    /* H195 deliberately does NOT touch Full Board scroll position. H178 already
       owns that behavior. H194 introduced a second scroll-memory system, which
       competed with H176/H178 and caused the visible jump toward the opponent
       board when opening Full Board. This layer only stabilizes which screen is
       active and leaves H178's established Full Board position memory alone. */
    const VIEW_KEY='mtg_active_view_v4';
    let requested=null;

    const applyView=view=>{
      if(!['you','full','opp'].includes(view))return;
      tabs.forEach(tab=>tab.classList.toggle('on',tab.dataset.v===view));
      document.querySelectorAll('.screen').forEach(screen=>screen.classList.toggle('on',screen.id===view));
      if(view==='opp')document.getElementById('hand')?.classList.remove('open');
    };

    const settle=view=>{
      applyView(view);
      requestAnimationFrame(()=>{
        if(requested!==view)return;
        applyView(view);
        requestAnimationFrame(()=>{if(requested===view)applyView(view)});
      });
      setTimeout(()=>{if(requested===view)applyView(view)},90);
    };

    tabs.forEach(tab=>tab.addEventListener('click',()=>{
      const view=tab.dataset.v;
      requested=view;
      try{sessionStorage.setItem(VIEW_KEY,view)}catch{}
      settle(view);
    }));

    let initial=document.querySelector('.tabs [data-v].on')?.dataset.v||'full';
    try{const saved=sessionStorage.getItem(VIEW_KEY);if(['you','full','opp'].includes(saved))initial=saved}catch{}
    requested=initial;
    settle(initial);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h193.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
