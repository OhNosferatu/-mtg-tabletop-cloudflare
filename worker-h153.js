import h152 from './worker-h152.js';

const BUILD='H153';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h153-opponent-ui-fallback'))return out;

  const css=`<style id="h153-opponent-ui-fallback">
/* H153: make the Opponent Side visibly match the intended public-control layout
   even if the app.js H152 runtime hook fails to initialize on iOS Safari. */
#opp{position:relative!important}
#opp .title{display:none!important}
#opp>.life-heart[data-life="opp"]{display:grid!important;right:8px!important;left:auto!important;top:7px!important;z-index:35!important}
#h153-opp-piles{position:absolute;inset:0;z-index:14;pointer-events:none}
#h153-opp-piles .h153-pile{position:absolute!important;left:1.4%!important;right:auto!important;margin:0!important;pointer-events:auto!important}
#h153-opp-piles .h153-cmd{top:13.5%!important;display:flex!important;gap:8px!important}
#h153-opp-piles .h153-exile{top:30%!important}
#h153-opp-piles .h153-deck{top:46.5%!important}
#h153-opp-piles .h153-graveyard{top:63%!important}
#h153-opp-piles .h153-tokens{top:79.5%!important}
#h153-opp-piles .zone,#h153-opp-piles .cmd{border-color:rgba(220,65,65,.56)!important}
#h153-opp-hand{position:absolute;right:58px;top:10px;z-index:35;height:32px;min-width:49px;padding:3px 7px;border:1px solid rgba(220,65,65,.70);border-radius:9px;background:#211b17;display:flex;align-items:center;justify-content:center;gap:6px;color:#fff;box-shadow:0 2px 5px #0007;pointer-events:none}
#h153-opp-hand .h153-hand-icon{display:block;width:11px;height:15px;border:1.5px solid #dc4141;border-radius:2px;box-sizing:border-box;box-shadow:3px -3px 0 -1px #211b17,3px -3px 0 0 rgba(220,65,65,.62)}
#h153-opp-hand b{font:1000 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
/* Hide the old bottom opponent-hand drawer: opponent hand stays count-only. */
#opp .opp-hand,#opp #opphand,#opp [class*="opp-hand-drawer"]{display:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h153-opponent-ui-fallback">window.addEventListener('DOMContentLoaded',()=>{
    const install=()=>{
      const opp=document.getElementById('opp');
      if(!opp){requestAnimationFrame(install);return}
      if(opp.dataset.h153Ready)return;
      opp.dataset.h153Ready='1';

      let piles=document.getElementById('h153-opp-piles');
      if(!piles){piles=document.createElement('div');piles.id='h153-opp-piles';opp.appendChild(piles)}
      let hand=document.getElementById('h153-opp-hand');
      if(!hand){hand=document.createElement('div');hand.id='h153-opp-hand';hand.innerHTML='<span class="h153-hand-icon" aria-hidden="true"></span><b>0</b>';opp.appendChild(hand)}

      const makeEmpty=(kind,label,icon,pos)=>{
        if(kind==='cmd'){
          const wrap=document.createElement('div');wrap.className='cmds h153-pile h153-cmd';
          const e=document.createElement('div');e.className='cmd';e.dataset.name='COMMANDER';e.dataset.icon='♛';e.innerHTML='<span class="count">0</span>';wrap.appendChild(e);return wrap;
        }
        const el=document.createElement('div');el.className='zone '+kind+' h153-pile '+pos;el.dataset.name=label;if(icon)el.dataset.icon=icon;el.innerHTML='<span class="count">0</span>';return el;
      };

      const cloneSource=(zone,pos,label,icon)=>{
        const src=document.querySelector('#h116-piles-opp [data-h117-zone="'+zone+'"]');
        if(!src)return makeEmpty(zone,label,icon,pos);
        const clone=src.cloneNode(true);
        clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
        clone.classList.add('h153-pile',pos);
        clone.dataset.name=label;
        if(icon)clone.dataset.icon=icon;
        clone.addEventListener('click',e=>{e.preventDefault();src.click?.()});
        return clone;
      };

      const sync=()=>{
        /* Prefer H152's native Opponent UI if it exists. */
        const native=document.getElementById('h152-opp-piles');
        if(native&&native.children.length){piles.style.display='none';hand.style.display='none';return}
        piles.style.display='block';hand.style.display='flex';
        piles.innerHTML='';
        piles.appendChild(cloneSource('cmd','h153-cmd','COMMANDER','♛'));
        piles.appendChild(cloneSource('exile','h153-exile','EXILE','✦'));
        piles.appendChild(cloneSource('deck','h153-deck','DECK',''));
        piles.appendChild(cloneSource('graveyard','h153-graveyard','GRAVEYARD','☠'));
        piles.appendChild(cloneSource('tokens','h153-tokens','TOKENS','◉'));
        const n=document.querySelector('#h117-hand-opp b')?.textContent||document.querySelector('[data-h134-hand="opp"]')?.textContent||'0';
        hand.querySelector('b').textContent=n;
      };

      sync();
      setInterval(sync,300);
      document.querySelectorAll('[data-v="opp"]').forEach(btn=>btn.addEventListener('click',()=>requestAnimationFrame(sync)));
      window.addEventListener('pageshow',sync);
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
    const response=await h152.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
