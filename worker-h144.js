import h143 from './worker-h143.js';

const BUILD='H144';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h144-stable-turn-color'))return out;

  const css=`<style id="h144-stable-turn-color">
/* H144: keep H143 blue/red turn colors, but make the button color state explicit
   and stable instead of re-evaluating the divider data-turn attribute every
   render tick. This removes Safari color flicker without touching turn logic. */
#h105divider #h134-turn-switch{transition:none!important}
#h105divider #h134-turn-switch[data-h144-color="you"]{
  background:linear-gradient(180deg,#326fc4,#23518f)!important;
  border-color:#79aef2!important;
  color:#fff!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 0 1px rgba(63,141,255,.18),0 2px 6px #0008!important;
}
#h105divider #h134-turn-switch[data-h144-color="opp"]{
  background:linear-gradient(180deg,#b84444,#7f2f2f)!important;
  border-color:#ef8585!important;
  color:#fff!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 0 0 1px rgba(220,65,65,.18),0 2px 6px #0008!important;
}
#h105divider #h134-turn-switch[data-h144-color] .h134-turn-label,
#h105divider #h134-turn-switch[data-h144-color] .h134-swap{
  color:#fff!important;
  text-shadow:0 1px 2px rgba(0,0,0,.72)!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h144-stable-turn-color-script">window.addEventListener('DOMContentLoaded',()=>{
    const install=()=>{
      const divider=document.getElementById('h105divider');
      const button=document.getElementById('h134-turn-switch');
      if(!divider||!button||!divider.dataset.h134Ready){requestAnimationFrame(install);return}
      if(button.dataset.h144Ready)return;
      button.dataset.h144Ready='1';

      const apply=()=>{button.dataset.h144Color=divider.dataset.turn==='opp'?'opp':'you'};
      apply();
      button.addEventListener('click',()=>setTimeout(apply,0));
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
    const response=await h143.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
