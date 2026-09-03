import h174 from './worker-h174.js';

const BUILD='H175';
const DIVIDER=58;
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=stamp(source);
  if(out.includes('H175_EXACT_FULL_CARD_COORDS'))return out;

  /* H175_EXACT_FULL_CARD_COORDS
     Full Board cards are positioned directly inside the exact owner half rect,
     using the same stored x/y percentages as the dedicated board. This removes
     the old .5%-of-a-two-board-layer conversion entirely. */
  out=out.replace(
    "d.style.left=c.x+'%';d.style.top=(owner==='you'?50+c.y*.5:c.y*.5)+'%';d.style.zIndex=String(20+index);d.dataset.h117Owner=owner;",
    "{const rr=h117HalfRect(owner),cr=$('#h105fullcontent')?.getBoundingClientRect();if(rr&&cr){d.style.left=(rr.left-cr.left+c.x/100*rr.width)+'px';d.style.top=(rr.top-cr.top+c.y/100*rr.height)+'px'}else{d.style.left=c.x+'%';d.style.top=c.y+'%'}}d.style.zIndex=String(20+index);d.dataset.h117Owner=owner;"
  );

  out=out.replace(
    "c.x=x/drag.r.width*100;c.y=y/drag.r.height*100;d.style.left=c.x+'%';d.style.top=(owner==='you'?50+c.y*.5:c.y*.5)+'%';",
    "c.x=x/drag.r.width*100;c.y=y/drag.r.height*100;{const cr=$('#h105fullcontent')?.getBoundingClientRect();if(cr){d.style.left=(drag.r.left-cr.left+c.x/100*drag.r.width)+'px';d.style.top=(drag.r.top-cr.top+c.y/100*drag.r.height)+'px'}}"
  );

  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h175-defined-board-frames'))return out;

  const css=`<style id="h175-defined-board-frames">
/* Two literal board rectangles. The upper red frame is Opponent, the lower blue
   frame is Your Side. Nothing above/below these rectangles is game space. */
#full{overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior-y:none!important;scroll-snap-type:y proximity!important}
#h105fullcontent{position:relative!important;box-sizing:border-box!important}
.h175-board-frame{position:absolute!important;left:0!important;right:0!important;box-sizing:border-box!important;pointer-events:none!important;z-index:4!important;border-radius:10px!important}
#h175-board-opp{top:0!important;height:var(--h174-board-h,610px)!important;border:2px solid rgba(220,65,65,.56)!important;scroll-snap-align:start!important}
#h175-board-you{top:calc(var(--h174-board-h,610px) + ${DIVIDER}px)!important;height:var(--h174-board-h,610px)!important;border:2px solid rgba(72,137,225,.62)!important;scroll-snap-align:start!important}
/* Make the exact board ends visible even when their rounded frame edge is near
   the viewport edge. */
#h175-board-opp::after,#h175-board-you::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:currentColor;opacity:.52}
#h175-board-opp{color:#dc4141}#h175-board-you{color:#4889e1}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h175-defined-board-frames">window.addEventListener('DOMContentLoaded',()=>{
    const content=document.getElementById('h105fullcontent');
    const full=document.getElementById('full');
    if(!content||!full)return;
    let opp=document.getElementById('h175-board-opp'),you=document.getElementById('h175-board-you');
    if(!opp){opp=document.createElement('div');opp.id='h175-board-opp';opp.className='h175-board-frame';opp.setAttribute('aria-hidden','true');content.appendChild(opp)}
    if(!you){you=document.createElement('div');you.id='h175-board-you';you.className='h175-board-frame';you.setAttribute('aria-hidden','true');content.appendChild(you)}

    const clamp=()=>{const max=Math.max(0,content.scrollHeight-full.clientHeight);full.scrollTop=Math.max(0,Math.min(max,full.scrollTop))};
    const sync=()=>{clamp();requestAnimationFrame(()=>{window.MTG_H168_manaLifecycle?.render?.()})};
    full.addEventListener('scroll',clamp,{passive:true});
    document.querySelectorAll('[data-v]').forEach(b=>b.addEventListener('click',()=>requestAnimationFrame(sync)));
    window.addEventListener('resize',sync,{passive:true});window.addEventListener('pageshow',sync);sync();
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h174.fetch(request,env,ctx);
    if(url.pathname.endsWith('.js')){const text=await response.text();return new Response(transformApp(text),{status:response.status,headers:headers(response.headers.get('content-type')||'application/javascript; charset=utf-8')})}
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){const text=await response.text();return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')})}
    return response;
  }
};
