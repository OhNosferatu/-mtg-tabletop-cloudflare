import h151 from './worker-h151.js';

const BUILD='H156';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h156-opponent-section-rebuild'))return out;

  /* Replace the entire dedicated Opponent section rather than appending into it.
     This avoids older opponent-hand/runtime layers overwriting our added markup. */
  const opponent=`<section id="opp" class="screen">
    <button class="life-heart" data-life="opp" aria-label="Opponent life total"><span>40</span></button>
    <div id="h156-opp-land" class="land-zone h156-opp-land" aria-hidden="true"></div>
    <div id="h156-opp-piles" aria-label="Opponent public zones">
      <div class="zone tokens h156-pile h156-tokens" data-name="TOKENS" data-icon="◉"><span class="count">0</span></div>
      <div class="zone graveyard h156-pile h156-graveyard" data-name="GRAVEYARD" data-icon="☠"><span class="count">0</span></div>
      <div class="zone deck empty h156-pile h156-deck" data-name="DECK"><span class="count">0</span></div>
      <div class="zone exile h156-pile h156-exile" data-name="EXILE" data-icon="✦"><span class="count">0</span></div>
      <div class="cmds h156-pile h156-cmd"><div class="cmd" data-name="COMMANDER" data-icon="♛"><span class="count">0</span></div></div>
    </div>
    <div id="h156-opp-hand" aria-label="Opponent hand"><span class="h156-hand-icon" aria-hidden="true"></span><b>0</b></div>
    <div id="oppcards"></div>
  </section>`;
  out=out.replace(/<section id="opp" class="screen">[\s\S]*?<\/section>/,opponent);

  const css=`<style id="h156-opponent-section-rebuild">
#opp{position:relative!important;overflow:hidden!important}
#oppcards{position:absolute!important;inset:0!important;z-index:8!important}
#h156-opp-land{position:absolute!important;left:17%!important;right:4%!important;top:2%!important;bottom:auto!important;height:27%!important;z-index:3!important;border:1.5px solid rgba(145,150,156,.48)!important;border-radius:12px!important;background:rgba(130,135,140,.07)!important;box-shadow:inset 0 0 0 1px rgba(210,214,218,.045)!important;pointer-events:none!important}
#h156-opp-piles{position:absolute!important;inset:0!important;z-index:20!important;pointer-events:none!important}
#h156-opp-piles .h156-pile{position:absolute!important;left:1.4%!important;right:auto!important;margin:0!important;pointer-events:auto!important}
#h156-opp-piles .h156-tokens{top:13.5%!important}
#h156-opp-piles .h156-graveyard{top:30%!important}
#h156-opp-piles .h156-deck{top:46.5%!important}
#h156-opp-piles .h156-exile{top:63%!important}
#h156-opp-piles .h156-cmd{top:79.5%!important;display:flex!important;gap:8px!important}
#h156-opp-piles .zone,#h156-opp-piles .cmd{border-color:rgba(220,65,65,.62)!important}
#h156-opp-piles .graveyard::after{content:'GRAVEYARD'!important}
#opp>.life-heart[data-life="opp"]{display:grid!important;top:auto!important;bottom:8px!important;right:8px!important;left:auto!important;z-index:35!important}
#h156-opp-hand{position:absolute!important;left:8px!important;bottom:10px!important;z-index:35!important;height:32px!important;min-width:49px!important;padding:3px 7px!important;border:1px solid rgba(220,65,65,.72)!important;border-radius:9px!important;background:#211b17!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;color:#fff!important;box-shadow:0 2px 5px #0007!important;pointer-events:none!important}
#h156-opp-hand .h156-hand-icon{display:block;width:11px;height:15px;border:1.5px solid #dc4141;border-radius:2px;box-sizing:border-box;box-shadow:3px -3px 0 -1px #211b17,3px -3px 0 0 rgba(220,65,65,.62)}
#h156-opp-hand b{font:1000 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
body.h156-opp-mode #hand{display:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h156-opponent-sync">window.addEventListener('DOMContentLoaded',()=>{
    const opp=document.getElementById('opp');if(!opp)return;
    const setMode=()=>document.body.classList.toggle('h156-opp-mode',opp.classList.contains('on'));
    const sync=()=>{
      setMode();
      const src=document.getElementById('h116-piles-opp');
      const map=[['tokens','h156-tokens'],['graveyard','h156-graveyard'],['deck','h156-deck'],['exile','h156-exile'],['cmd','h156-cmd']];
      map.forEach(([zone,cls])=>{
        const dst=opp.querySelector('.'+cls),s=src?.querySelector('[data-h117-zone="'+zone+'"]');if(!dst)return;
        const count=s?.querySelector('.count')?.textContent||'0';
        const badge=dst.querySelector('.count');if(badge)badge.textContent=count;
        if(zone==='deck'){
          dst.querySelectorAll(':scope>img').forEach(x=>x.remove());
          const img=s?.querySelector(':scope>img');if(img&&Number(count)>0)dst.insertBefore(img.cloneNode(true),dst.firstChild);
          dst.classList.toggle('empty',Number(count)<=0);
        }
      });
      const n=document.querySelector('#h117-hand-opp b')?.textContent||document.querySelector('[data-h134-hand="opp"]')?.textContent||'0';
      const hb=document.querySelector('#h156-opp-hand b');if(hb)hb.textContent=n;
    };
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>requestAnimationFrame(sync)));
    new MutationObserver(sync).observe(opp,{attributes:true,attributeFilter:['class']});
    window.addEventListener('pageshow',sync);sync();setInterval(sync,300);
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
