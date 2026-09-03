import h171 from './worker-h171.js';

const BUILD='H172';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h172-opponent-view-geometry'))return out;

  const css=`<style id="h172-opponent-view-geometry">
/* H172: the dedicated Opponent screen is the visual source of truth for the
   upper Full Board half. Keep the same playable-area/land-zone geometry so
   cards have identical visual coordinates in both views. */
#h105fullcontent .h133-land-opp{
  left:17%!important;
  right:4%!important;
  width:auto!important;
}
body.h157-opp-mode #h157-opp-land{
  left:17%!important;
  right:4%!important;
  top:2%!important;
  height:27%!important;
}
/* Both card layers fill one exact normal battlefield coordinate plane. */
#oppcards{position:absolute!important;inset:0!important;width:100%!important;height:100%!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h172-opponent-view-geometry">window.addEventListener('DOMContentLoaded',()=>{
    const align=()=>{
      const content=document.getElementById('h105fullcontent');
      const land=document.querySelector('#h105fullcontent .h133-land-opp');
      if(content&&land){
        const divider=parseFloat(getComputedStyle(content).getPropertyValue('--h133-divider-h'))||58;
        const boardH=Math.max(1,(content.clientHeight-divider)/2);
        /* Dedicated Opponent uses top:2%; use that exact normal-board offset
           instead of H133's older 5% Full Board value. */
        land.style.setProperty('top',(boardH*.02)+'px','important');
        land.style.setProperty('height',(boardH*.27)+'px','important');
      }
    };
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>requestAnimationFrame(align)));
    window.addEventListener('resize',align,{passive:true});
    window.addEventListener('pageshow',align);
    align();setTimeout(align,80);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h171.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
