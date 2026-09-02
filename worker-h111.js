import h110 from './worker-h110.js';

const BUILD='H111';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replaceAll('H110','H111');
  if(out.includes('h111-hand-aware-scrollbar'))return out;

  const css=`<style id="h111-hand-aware-scrollbar">
/* Keep the Full Board scrubber out of the hand tray. Its exact height is
   calculated in JS from the visible hand overlap, but this transition keeps
   opening/closing the hand from feeling abrupt. */
#h105fullscroll{
  transition:height .18s ease,top .18s ease,opacity .18s ease!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h111-hand-aware-scrollbar-script">window.addEventListener('DOMContentLoaded',()=>{
    const full=document.getElementById('full');
    const hand=document.getElementById('hand');
    const bar=document.getElementById('h105fullscroll');
    if(!full||!hand||!bar)return;

    let raf=0;
    const layoutBar=()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const fr=full.getBoundingClientRect();
        if(fr.width<1||fr.height<1)return;
        const hr=hand.getBoundingClientRect();
        const topPad=Math.max(14,Math.round(fr.height*.07));
        const normalBottom=Math.max(14,Math.round(fr.height*.07));
        const overlaps=hr.top<fr.bottom&&hr.bottom>fr.top;
        const overlap=overlaps?Math.max(0,fr.bottom-Math.max(fr.top,hr.top)):0;
        const bottomPad=overlap>0?Math.ceil(overlap+10):normalBottom;
        const available=fr.height-topPad-bottomPad;

        bar.style.top=topPad+'px';
        bar.style.height=Math.max(120,available)+'px';
        bar.style.opacity=available<120?'0':'1';
        bar.style.pointerEvents=available<120?'none':'auto';
      });
    };

    new MutationObserver(layoutBar).observe(hand,{attributes:true,attributeFilter:['class','style']});
    hand.addEventListener('transitionend',layoutBar);
    window.addEventListener('resize',layoutBar,{passive:true});
    window.addEventListener('orientationchange',layoutBar,{passive:true});
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>{
      if(btn.dataset.v==='full')setTimeout(layoutBar,0);
    }));
    if('ResizeObserver'in window){
      const ro=new ResizeObserver(layoutBar);
      ro.observe(hand);ro.observe(full);
    }
    layoutBar();
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h110.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
