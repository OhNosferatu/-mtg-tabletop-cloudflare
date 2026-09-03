import h151 from './worker-h151.js';

const BUILD='H157';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h157-opponent-overlay'))return out;

  const css=`<style id="h157-opponent-overlay">
/* H157: render the dedicated Opponent view as its own overlay inside #board.
   This intentionally does not depend on the legacy #opp section DOM. */
#h157-opp-shell{display:none;position:absolute;inset:0;z-index:24;pointer-events:none}
body.h157-opp-mode #h157-opp-shell{display:block}
body.h157-opp-mode #hand{display:none!important}
#h157-opp-land{position:absolute;left:17%;right:4%;top:2%;height:27%;border:1.5px solid rgba(145,150,156,.48);border-radius:12px;background:rgba(130,135,140,.07);box-shadow:inset 0 0 0 1px rgba(210,214,218,.045)}
#h157-opp-piles{position:absolute;inset:0}
#h157-opp-piles .h157-pile{position:absolute!important;left:1.4%!important;right:auto!important;margin:0!important;pointer-events:auto!important}
#h157-opp-piles .h157-tokens{top:13.5%!important}
#h157-opp-piles .h157-graveyard{top:30%!important}
#h157-opp-piles .h157-deck{top:46.5%!important}
#h157-opp-piles .h157-exile{top:63%!important}
#h157-opp-piles .h157-cmd{top:79.5%!important;display:flex!important;gap:8px!important}
#h157-opp-piles .zone,#h157-opp-piles .cmd{border-color:rgba(220,65,65,.60)!important}
#h157-opp-piles .graveyard::after{content:'GRAVEYARD'!important}
#h157-opp-hand{position:absolute;left:8px;bottom:10px;height:32px;min-width:49px;padding:3px 7px;border:1px solid rgba(220,65,65,.70);border-radius:9px;background:#211b17;display:flex;align-items:center;justify-content:center;gap:6px;color:#fff;box-shadow:0 2px 5px #0007}
#h157-opp-hand-icon{display:block;width:11px;height:15px;border:1.5px solid #dc4141;border-radius:2px;box-sizing:border-box;box-shadow:3px -3px 0 -1px #211b17,3px -3px 0 0 rgba(220,65,65,.62)}
#h157-opp-hand b{font:1000 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
#h157-opp-life{position:absolute;right:8px;bottom:8px;width:54px;height:49px;border:0;background:transparent;color:#fff;font-weight:1000;pointer-events:auto;display:grid;place-items:center;padding:0}
#h157-opp-life::before{content:'♥';position:absolute;inset:0;display:grid;place-items:center;color:#dc4141;font-size:49px;filter:drop-shadow(0 2px 3px #0008)}
#h157-opp-life span{position:relative;z-index:2;font-size:15px;text-shadow:0 1px 3px #000}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h157-opponent-overlay">window.addEventListener('DOMContentLoaded',()=>{
    const board=document.getElementById('board');if(!board)return;
    let shell=document.getElementById('h157-opp-shell');
    if(!shell){
      shell=document.createElement('div');shell.id='h157-opp-shell';
      shell.innerHTML='<div id="h157-opp-land"></div><div id="h157-opp-piles">'+
        '<div class="zone tokens h157-pile h157-tokens" data-name="TOKENS" data-icon="◉"><span class="count">0</span></div>'+
        '<div class="zone graveyard h157-pile h157-graveyard" data-name="GRAVEYARD" data-icon="☠"><span class="count">0</span></div>'+
        '<div class="zone deck empty h157-pile h157-deck" data-name="DECK"><span class="count">0</span></div>'+
        '<div class="zone exile h157-pile h157-exile" data-name="EXILE" data-icon="✦"><span class="count">0</span></div>'+
        '<div class="cmds h157-pile h157-cmd"><div class="cmd" data-name="COMMANDER" data-icon="♛"><span class="count">0</span></div></div>'+
        '</div><div id="h157-opp-hand"><span id="h157-opp-hand-icon"></span><b>0</b></div><button id="h157-opp-life" aria-label="Opponent life total"><span>40</span></button>';
      board.appendChild(shell);
    }

    const oppTab=document.querySelector('[data-v="opp"]');
    const setMode=()=>document.body.classList.toggle('h157-opp-mode',!!oppTab?.classList.contains('on'));
    const mirrorCount=(zone,cls)=>{
      const dst=shell.querySelector('.'+cls);if(!dst)return;
      const src=document.querySelector('#h116-piles-opp [data-h117-zone="'+zone+'"]');
      const count=src?.querySelector('.count')?.textContent||'0';
      const badge=dst.querySelector('.count');if(badge)badge.textContent=count;
      if(zone==='deck'){
        dst.querySelectorAll(':scope>img').forEach(x=>x.remove());
        const img=src?.querySelector(':scope>img');if(img&&Number(count)>0)dst.insertBefore(img.cloneNode(true),dst.firstChild);
        dst.classList.toggle('empty',Number(count)<=0);
      }
    };
    const sync=()=>{
      setMode();
      mirrorCount('tokens','h157-tokens');mirrorCount('graveyard','h157-graveyard');mirrorCount('deck','h157-deck');mirrorCount('exile','h157-exile');mirrorCount('cmd','h157-cmd');
      const hand=document.querySelector('#h117-hand-opp b')?.textContent||document.querySelector('[data-h134-hand="opp"]')?.textContent||'0';
      const hb=document.querySelector('#h157-opp-hand b');if(hb)hb.textContent=hand;
      const sourceLife=document.querySelector('.life-heart[data-life="opp"] span');const life=document.querySelector('#h157-opp-life span');if(sourceLife&&life)life.textContent=sourceLife.textContent;
    };
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>requestAnimationFrame(sync)));
    document.getElementById('h157-opp-life')?.addEventListener('click',()=>document.querySelector('.life-heart[data-life="opp"]')?.click());
    window.addEventListener('pageshow',sync);sync();setInterval(sync,250);
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
