import h151 from './worker-h151.js';

const BUILD='H155';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h155-static-opponent-board'))return out;

  const marker='<div id="oppcards"></div></section>';
  const replacement=`<div id="h155-opp-land" class="h155-land-zone" aria-hidden="true"></div>
<div id="h155-opp-piles" aria-label="Opponent public zones">
  <div class="zone tokens h155-pile h155-tokens" data-name="TOKENS" data-icon="◉"><span class="count">0</span></div>
  <div class="zone graveyard h155-pile h155-graveyard" data-name="GRAVEYARD" data-icon="☠"><span class="count">0</span></div>
  <div class="zone deck empty h155-pile h155-deck" data-name="DECK"><span class="count">0</span></div>
  <div class="zone exile h155-pile h155-exile" data-name="EXILE" data-icon="✦"><span class="count">0</span></div>
  <div class="cmds h155-pile h155-cmd"><div class="cmd" data-name="COMMANDER" data-icon="♛"><span class="count">0</span></div></div>
</div>
<div id="h155-opp-hand" aria-label="Opponent hand"><span class="h155-hand-icon" aria-hidden="true"></span><b>0</b></div>
<div id="oppcards"></div></section>`;
  out=out.replace(marker,replacement);

  const css=`<style id="h155-static-opponent-board">
/* H155: dedicated Opponent tab is rendered directly in HTML so it cannot fail
   because of a deferred/runtime initialization race on iOS Safari. */
#opp{position:relative!important;overflow:hidden!important}
#opp .title{display:none!important}
#oppcards{position:absolute!important;inset:0!important;z-index:8!important}
#h155-opp-land{position:absolute!important;left:17%!important;right:4%!important;top:2%!important;height:27%!important;z-index:3!important;border:1.5px solid rgba(145,150,156,.48)!important;border-radius:12px!important;background:rgba(130,135,140,.07)!important;box-shadow:inset 0 0 0 1px rgba(210,214,218,.045)!important;pointer-events:none!important}
#h155-opp-piles{position:absolute!important;inset:0!important;z-index:14!important;pointer-events:none!important}
#h155-opp-piles .h155-pile{position:absolute!important;left:1.4%!important;right:auto!important;margin:0!important;pointer-events:auto!important}
#h155-opp-piles .h155-tokens{top:13.5%!important}
#h155-opp-piles .h155-graveyard{top:30%!important}
#h155-opp-piles .h155-deck{top:46.5%!important}
#h155-opp-piles .h155-exile{top:63%!important}
#h155-opp-piles .h155-cmd{top:79.5%!important;display:flex!important;gap:8px!important}
#h155-opp-piles .zone,#h155-opp-piles .cmd{border-color:rgba(220,65,65,.56)!important}
#h155-opp-piles .graveyard::after{content:'GRAVEYARD'!important}
#opp>.life-heart[data-life="opp"]{display:grid!important;top:auto!important;bottom:8px!important;right:8px!important;left:auto!important;z-index:35!important}
#h155-opp-hand{position:absolute!important;left:8px!important;bottom:10px!important;z-index:35!important;height:32px!important;min-width:49px!important;padding:3px 7px!important;border:1px solid rgba(220,65,65,.70)!important;border-radius:9px!important;background:#211b17!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;color:#fff!important;box-shadow:0 2px 5px #0007!important;pointer-events:none!important}
#h155-opp-hand .h155-hand-icon{display:block;width:11px;height:15px;border:1.5px solid #dc4141;border-radius:2px;box-sizing:border-box;box-shadow:3px -3px 0 -1px #211b17,3px -3px 0 0 rgba(220,65,65,.62)}
#h155-opp-hand b{font:1000 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h155-static-opponent-sync">window.addEventListener('DOMContentLoaded',()=>{
    const opp=document.getElementById('opp');
    if(!opp)return;
    const sync=()=>{
      const src=document.getElementById('h116-piles-opp');
      const map=[['tokens','h155-tokens'],['graveyard','h155-graveyard'],['deck','h155-deck'],['exile','h155-exile'],['cmd','h155-cmd']];
      map.forEach(([zone,cls])=>{
        const dst=opp.querySelector('.'+cls);const s=src?.querySelector('[data-h117-zone="'+zone+'"]');if(!dst||!s)return;
        const count=s.querySelector('.count')?.textContent||'0';
        const badge=dst.querySelector('.count');if(badge)badge.textContent=count;
        if(zone==='deck'){
          dst.querySelectorAll(':scope>img').forEach(x=>x.remove());
          const img=s.querySelector(':scope>img');if(img&&Number(count)>0)dst.insertBefore(img.cloneNode(true),dst.firstChild);
          dst.classList.toggle('empty',Number(count)<=0);
        }
      });
      const n=document.querySelector('#h117-hand-opp b')?.textContent||document.querySelector('[data-h134-hand="opp"]')?.textContent||'0';
      const hb=document.querySelector('#h155-opp-hand b');if(hb)hb.textContent=n;
      /* Hide the legacy opponent-hand Open control while keeping the hand count. */
      [...opp.querySelectorAll('button')].forEach(b=>{if(b.textContent.trim().toLowerCase()==='open'){const p=b.parentElement;b.style.display='none';if(p&&p!==opp)p.style.pointerEvents='none'}});
    };
    sync();
    document.querySelectorAll('[data-v="opp"]').forEach(btn=>btn.addEventListener('click',()=>requestAnimationFrame(sync)));
    window.addEventListener('pageshow',sync);
    setInterval(sync,300);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h151.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
