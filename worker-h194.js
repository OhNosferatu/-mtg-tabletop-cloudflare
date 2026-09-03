import h193 from './worker-h193.js';

const BUILD='H194';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h194-stable-screen-switching'))return out;

  const script=`<script id="h194-stable-screen-switching">window.addEventListener('DOMContentLoaded',()=>{
    const tabs=[...document.querySelectorAll('.tabs [data-v]')];
    const viewport=document.getElementById('h105fullviewport');
    const content=document.getElementById('h105fullcontent');
    if(!tabs.length)return;

    const VIEW_KEY='mtg_active_view_v3';
    const FULL_SCROLL_KEY='mtg_full_scroll_v2';
    let requested=null;

    const maxFullScroll=()=>viewport&&content?Math.max(0,content.scrollHeight-viewport.clientHeight):0;
    const saveFullScroll=()=>{
      if(!viewport)return;
      const y=Math.max(0,Math.min(maxFullScroll(),viewport.scrollTop));
      try{sessionStorage.setItem(FULL_SCROLL_KEY,String(y))}catch{}
    };
    const readFullScroll=()=>{
      try{return Math.max(0,Number(sessionStorage.getItem(FULL_SCROLL_KEY))||0)}catch{return 0}
    };
    const restoreFullScroll=()=>{
      if(!viewport)return;
      const y=Math.max(0,Math.min(maxFullScroll(),readFullScroll()));
      viewport.scrollTop=y;
      const bar=document.getElementById('h105fullscroll');
      if(bar)bar.value=String(Math.round(y));
    };

    const applyView=view=>{
      if(!['you','full','opp'].includes(view))return;
      for(const tab of tabs)tab.classList.toggle('on',tab.dataset.v===view);
      document.querySelectorAll('.screen').forEach(screen=>screen.classList.toggle('on',screen.id===view));
      if(view==='opp')document.getElementById('hand')?.classList.remove('open');
    };

    const settle=view=>{
      applyView(view);
      requestAnimationFrame(()=>{
        if(requested!==view)return;
        applyView(view);
        if(view==='full')restoreFullScroll();
        requestAnimationFrame(()=>{
          if(requested!==view)return;
          applyView(view);
          if(view==='full')restoreFullScroll();
        });
      });
      setTimeout(()=>{
        if(requested!==view)return;
        applyView(view);
        if(view==='full')restoreFullScroll();
      },90);
    };

    tabs.forEach(tab=>{
      tab.addEventListener('pointerdown',()=>{
        const current=document.querySelector('.tabs [data-v].on')?.dataset.v;
        if(current==='full')saveFullScroll();
      },true);
      tab.addEventListener('click',()=>{
        const view=tab.dataset.v;
        requested=view;
        try{sessionStorage.setItem(VIEW_KEY,view)}catch{}
        settle(view);
      });
    });

    viewport?.addEventListener('scroll',()=>{
      if(document.querySelector('.tabs [data-v="full"]')?.classList.contains('on'))saveFullScroll();
    },{passive:true});

    let initial='full';
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
