import h139 from './worker-h139.js';

const BUILD='H140';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h140-active-turn-glow'))return out;

  const css=`<style id="h140-active-turn-glow">
:root{
  --h140-you-glow:rgba(63,141,255,.16);
  --h140-you-edge:rgba(63,141,255,.54);
  --h140-opp-glow:rgba(220,65,65,.16);
  --h140-opp-edge:rgba(220,65,65,.54);
}

/* Dedicated side screens: preserve the H137 identity rail and only strengthen
   the corresponding side while it owns the active turn. */
#you,#opp{transition:box-shadow .18s ease!important}
#you[data-h140-active="1"]{
  box-shadow:inset 0 0 0 2px var(--h140-you-edge),inset 0 0 42px var(--h140-you-glow),inset 0 0 86px rgba(63,141,255,.055)!important;
}
#opp[data-h140-active="1"]{
  box-shadow:inset 0 0 0 2px var(--h140-opp-edge),inset 0 0 42px var(--h140-opp-glow),inset 0 0 86px rgba(220,65,65,.055)!important;
}

/* Full Board: use the existing non-interactive H137 half overlays. This adds no
   new layer and therefore cannot affect dragging, snapping, or battlefield size. */
.h137-half-accent{transition:box-shadow .18s ease,background .18s ease!important}
#h105fullcontent[data-h140-turn="you"] .h137-half-you{
  background:radial-gradient(ellipse at center,rgba(63,141,255,.055),transparent 72%)!important;
  box-shadow:inset 0 0 0 2px rgba(63,141,255,.30),inset 0 0 48px rgba(63,141,255,.15),inset 0 0 96px rgba(63,141,255,.045)!important;
}
#h105fullcontent[data-h140-turn="opp"] .h137-half-opp{
  background:radial-gradient(ellipse at center,rgba(220,65,65,.055),transparent 72%)!important;
  box-shadow:inset 0 0 0 2px rgba(220,65,65,.30),inset 0 0 48px rgba(220,65,65,.15),inset 0 0 96px rgba(220,65,65,.045)!important;
}

/* Keep the inactive half at the normal H137 accent strength. */
#h105fullcontent[data-h140-turn="you"] .h137-half-opp{
  background:transparent!important;
  box-shadow:inset 0 0 28px var(--h137-opp-faint)!important;
}
#h105fullcontent[data-h140-turn="opp"] .h137-half-you{
  background:transparent!important;
  box-shadow:inset 0 0 28px var(--h137-you-faint)!important;
}

/* Slightly reinforce the already-active divider identity box so the center
   controls and battlefield glow read as one turn-state system. */
#h105divider .h134-you-box[data-active="1"]{
  box-shadow:0 0 0 1px rgba(63,141,255,.25),0 0 12px rgba(63,141,255,.14),0 2px 6px #0008!important;
}
#h105divider .h134-opp-box[data-active="1"]{
  box-shadow:0 0 0 1px rgba(220,65,65,.25),0 0 12px rgba(220,65,65,.14),0 2px 6px #0008!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h140-active-turn-glow-script">window.addEventListener('DOMContentLoaded',()=>{
    const install=()=>{
      const divider=document.getElementById('h105divider');
      const content=document.getElementById('h105fullcontent');
      const you=document.getElementById('you');
      const opp=document.getElementById('opp');
      if(!divider||!content||!you||!opp||!divider.dataset.h134Ready){requestAnimationFrame(install);return}
      if(divider.dataset.h140Ready)return;
      divider.dataset.h140Ready='1';

      let last='';
      const sync=()=>{
        const active=divider.dataset.turn==='opp'?'opp':'you';
        if(active===last)return;
        last=active;
        content.dataset.h140Turn=active;
        you.dataset.h140Active=active==='you'?'1':'0';
        opp.dataset.h140Active=active==='opp'?'1':'0';
      };

      sync();
      new MutationObserver(sync).observe(divider,{attributes:true,attributeFilter:['data-turn']});
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
    const response=await h139.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
