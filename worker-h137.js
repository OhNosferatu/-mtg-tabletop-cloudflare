import h136 from './worker-h136.js';

const BUILD='H137';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h137-player-opponent-accents'))return out;

  const css=`<style id="h137-player-opponent-accents">
:root{
  --h137-you:#3f8dff;
  --h137-you-soft:rgba(63,141,255,.42);
  --h137-you-faint:rgba(63,141,255,.075);
  --h137-opp:#dc4141;
  --h137-opp-soft:rgba(220,65,65,.42);
  --h137-opp-faint:rgba(220,65,65,.075);
}

/* Normal side views: preserve all geometry and use inset accent rails/glow. */
#you{
  box-shadow:inset 0 0 0 2px var(--h137-you-soft),inset 0 0 30px var(--h137-you-faint)!important;
}
#opp{
  box-shadow:inset 0 0 0 2px var(--h137-opp-soft),inset 0 0 30px var(--h137-opp-faint)!important;
}

/* Your Side controls/piles pick up the blue player identity without changing
   their dimensions or positions. */
#you .zone,#you .cmd{
  border-color:rgba(63,141,255,.62)!important;
  box-shadow:inset 0 0 0 1px rgba(63,141,255,.10),0 2px 7px #0006!important;
}
#you .zone:after,#you .cmd:after{color:#8dbaff!important}
#you .life-heart::before{color:var(--h137-you)!important}
#you .land-zone{
  border-color:rgba(63,141,255,.46)!important;
  background:rgba(36,93,158,.075)!important;
  box-shadow:inset 0 0 0 1px rgba(63,141,255,.10)!important;
}

/* Opponent standalone view. */
#opp .title{
  border-color:rgba(220,65,65,.56)!important;
  color:#ffb0b0!important;
  box-shadow:0 0 0 1px rgba(220,65,65,.08)!important;
}
#opp .life-heart::before{color:var(--h137-opp)!important}

/* Player-owned hand panel follows the same blue accent language. */
#hand{
  border-color:rgba(63,141,255,.46)!important;
  box-shadow:0 4px 16px #0008,inset 0 0 0 1px rgba(63,141,255,.07)!important;
}

/* Navigation shows which identity each dedicated side belongs to. */
.tabs button[data-v="you"].on{
  border-color:rgba(63,141,255,.72)!important;
  color:#d8e8ff!important;
  box-shadow:inset 0 0 0 1px rgba(63,141,255,.13)!important;
}
.tabs button[data-v="opp"].on{
  border-color:rgba(220,65,65,.72)!important;
  color:#ffd9d9!important;
  box-shadow:inset 0 0 0 1px rgba(220,65,65,.13)!important;
}

/* Full Board: two transparent, non-interactive overlays mark the opponent half
   red and player half blue. Their height is calculated around H133's extra
   divider, so neither battlefield is resized or shifted. */
.h137-half-accent{
  position:absolute!important;
  left:0!important;
  right:0!important;
  height:calc((100% - var(--h133-divider-h,58px))/2)!important;
  pointer-events:none!important;
  z-index:6!important;
  box-sizing:border-box!important;
}
.h137-half-opp{
  top:0!important;
  border-left:2px solid var(--h137-opp-soft)!important;
  border-right:2px solid var(--h137-opp-soft)!important;
  box-shadow:inset 0 0 28px var(--h137-opp-faint)!important;
}
.h137-half-you{
  bottom:0!important;
  border-left:2px solid var(--h137-you-soft)!important;
  border-right:2px solid var(--h137-you-soft)!important;
  box-shadow:inset 0 0 28px var(--h137-you-faint)!important;
}

/* Full Board piles inherit their owner's color while keeping H119 dimensions. */
#h116-piles-you .zone,#h116-piles-you .cmd{
  border-color:rgba(63,141,255,.62)!important;
  box-shadow:inset 0 0 0 1px rgba(63,141,255,.10),0 2px 7px #0006!important;
}
#h116-piles-opp .zone,#h116-piles-opp .cmd{
  border-color:rgba(220,65,65,.62)!important;
  box-shadow:inset 0 0 0 1px rgba(220,65,65,.10),0 2px 7px #0006!important;
}
#h116-piles-you .zone:after,#h116-piles-you .cmd:after{color:#8dbaff!important}
#h116-piles-opp .zone:after,#h116-piles-opp .cmd:after{color:#ff9f9f!important}

/* Divider identity boxes now carry the same side accent as their heart. */
#h105divider .h134-you-box{
  border-color:rgba(63,141,255,.64)!important;
  background:linear-gradient(90deg,rgba(63,141,255,.09),#211b17 46%)!important;
}
#h105divider .h134-opp-box{
  border-color:rgba(220,65,65,.64)!important;
  background:linear-gradient(270deg,rgba(220,65,65,.09),#211b17 46%)!important;
}
#h105divider .h134-you-box[data-active="1"]{
  border-color:var(--h137-you)!important;
  box-shadow:0 0 0 1px rgba(63,141,255,.24),0 2px 6px #0008!important;
}
#h105divider .h134-opp-box[data-active="1"]{
  border-color:var(--h137-opp)!important;
  box-shadow:0 0 0 1px rgba(220,65,65,.24),0 2px 6px #0008!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h137-player-opponent-accents">window.addEventListener('DOMContentLoaded',()=>{
    const install=()=>{
      const content=document.getElementById('h105fullcontent');
      if(!content){requestAnimationFrame(install);return}
      if(content.querySelector('.h137-half-accent'))return;
      const opp=document.createElement('div');opp.className='h137-half-accent h137-half-opp';opp.setAttribute('aria-hidden','true');
      const you=document.createElement('div');you.className='h137-half-accent h137-half-you';you.setAttribute('aria-hidden','true');
      content.insertBefore(opp,content.firstChild);content.insertBefore(you,content.firstChild);
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
    const response=await h136.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
