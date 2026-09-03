import h151 from './worker-h151.js';

const BUILD='H154';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h154-mirrored-opponent-board'))return out;

  const css=`<style id="h154-mirrored-opponent-board">
/* H154: Dedicated Opponent screen is a true vertical mirror of Your Side.
   Mirrored pile order: Tokens -> Graveyard -> Deck -> Exile -> Commander.
   Land zone is at the TOP of the opponent battlefield. */
#opp{position:relative!important;overflow:hidden!important}
#opp .title{display:none!important}
#oppcards{position:absolute!important;inset:0!important;z-index:8!important}

#h154-opp-land{position:absolute!important;left:17%!important;right:4%!important;top:2%!important;height:27%!important;z-index:3!important;border:1.5px solid rgba(145,150,156,.48)!important;border-radius:12px!important;background:rgba(130,135,140,.07)!important;box-shadow:inset 0 0 0 1px rgba(210,214,218,.045)!important;pointer-events:none!important}

#h154-opp-piles{position:absolute;inset:0;z-index:14;pointer-events:none}
#h154-opp-piles .h154-pile{position:absolute!important;left:1.4%!important;right:auto!important;margin:0!important;pointer-events:auto!important}
#h154-opp-piles .h154-tokens{top:13.5%!important}
#h154-opp-piles .h154-graveyard{top:30%!important}
#h154-opp-piles .h154-deck{top:46.5%!important}
#h154-opp-piles .h154-exile{top:63%!important}
#h154-opp-piles .h154-cmd{top:79.5%!important;display:flex!important;gap:8px!important}
#h154-opp-piles .zone,#h154-opp-piles .cmd{border-color:rgba(220,65,65,.56)!important}

/* Opponent public info sits at the bottom, mirroring Your Side's top controls. */
#opp>.life-heart[data-life="opp"]{display:grid!important;top:auto!important;bottom:8px!important;right:8px!important;left:auto!important;z-index:35!important}
#h154-opp-hand{position:absolute;left:8px;bottom:10px;z-index:35;height:32px;min-width:49px;padding:3px 7px;border:1px solid rgba(220,65,65,.70);border-radius:9px;background:#211b17;display:flex;align-items:center;justify-content:center;gap:6px;color:#fff;box-shadow:0 2px 5px #0007;pointer-events:none}
#h154-opp-hand .h154-hand-icon{display:block;width:11px;height:15px;border:1.5px solid #dc4141;border-radius:2px;box-sizing:border-box;box-shadow:3px -3px 0 -1px #211b17,3px -3px 0 0 rgba(220,65,65,.62)}
#h154-opp-hand b{font:1000 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}

/* Remove the old bottom opponent-hand drawer/open bar. */
#opp .opp-hand,#opp #opphand,#opp [class*="opp-hand-drawer"],#opp [class*="opp-hand-panel"]{display:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h154-mirrored-opponent-board">window.addEventListener('DOMContentLoaded',()=>{
    const install=()=>{
      const opp=document.getElementById('opp');
      if(!opp){requestAnimationFrame(install);return}
      if(opp.dataset.h154Ready)return;
      opp.dataset.h154Ready='1';

      const old152=document.getElementById('h152-opp-piles');old152?.remove();
      const old153=document.getElementById('h153-opp-piles');old153?.remove();
      document.getElementById('h152-opp-hand')?.remove();
      document.getElementById('h153-opp-hand')?.remove();

      let land=document.getElementById('h154-opp-land');if(!land){land=document.createElement('div');land.id='h154-opp-land';land.setAttribute('aria-hidden','true');opp.appendChild(land)}
      let piles=document.getElementById('h154-opp-piles');if(!piles){piles=document.createElement('div');piles.id='h154-opp-piles';opp.appendChild(piles)}
      let hand=document.getElementById('h154-opp-hand');if(!hand){hand=document.createElement('div');hand.id='h154-opp-hand';hand.innerHTML='<span class="h154-hand-icon" aria-hidden="true"></span><b>0</b>';opp.appendChild(hand)}

      const makeEmpty=(zone,label,icon,pos)=>{
        if(zone==='cmd'){
          const wrap=document.createElement('div');wrap.className='cmds h154-pile h154-cmd';
          const e=document.createElement('div');e.className='cmd';e.dataset.name='COMMANDER';e.dataset.icon='♛';e.innerHTML='<span class="count">0</span>';wrap.appendChild(e);return wrap;
        }
        const el=document.createElement('div');el.className='zone '+zone+' h154-pile '+pos;el.dataset.name=label;if(icon)el.dataset.icon=icon;el.innerHTML='<span class="count">0</span>';return el;
      };

      const cloneSource=(zone,pos,label,icon)=>{
        const src=document.querySelector('#h116-piles-opp [data-h117-zone="'+zone+'"]');
        if(!src)return makeEmpty(zone,label,icon,pos);
        const clone=src.cloneNode(true);
        clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
        clone.classList.add('h154-pile',pos);clone.dataset.name=label;if(icon)clone.dataset.icon=icon;
        clone.addEventListener('click',e=>{e.preventDefault();src.click?.()});
        return clone;
      };

      const sync=()=>{
        piles.innerHTML='';
        piles.appendChild(cloneSource('tokens','h154-tokens','TOKENS','◉'));
        piles.appendChild(cloneSource('graveyard','h154-graveyard','GRAVEYARD','☠'));
        piles.appendChild(cloneSource('deck','h154-deck','DECK',''));
        piles.appendChild(cloneSource('exile','h154-exile','EXILE','✦'));
        piles.appendChild(cloneSource('cmd','h154-cmd','COMMANDER','♛'));
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
    const response=await h151.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
