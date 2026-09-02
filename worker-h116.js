import h115 from './worker-h115.js';

const BUILD='H116';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replaceAll('H115','H116');
  if(out.includes('h116-fullboard-piles-card-size'))return out;

  const css=`<style id="h116-fullboard-piles-card-size">
/* With pile columns restored on Full Board, use the same battlefield geometry
   as Your Side. The land zones once again leave room for that left pile column. */
#h105fullcontent::before,
#h105fullcontent::after{
  left:16%!important;
  right:5%!important;
}

/* H114 hard-coded a larger Full Board card size. Instead, H116 reads the actual
   computed Your Side card width at runtime and feeds it into this variable, so
   Full Board cards stay exactly the same size as normal battlefield cards. */
#fullcards .full-mini-card,
#fullcards .full-you-card,
#fullcards .full-opp-card,
#fullcards .card{
  width:var(--h116-field-card-width,46px)!important;
  height:auto!important;
  aspect-ratio:.716!important;
  overflow:hidden!important;
  border-radius:7px!important;
  background:#111!important;
}
#fullcards .full-mini-card>img,
#fullcards .full-you-card>img,
#fullcards .full-opp-card>img,
#fullcards .card>img{
  display:block!important;
  width:100%!important;
  height:100%!important;
  object-fit:contain!important;
  object-position:center!important;
  border-radius:6px!important;
}

/* Read-only pile columns for each full-size half. These use the exact same zone
   and commander components as Your Side, only positioned in the two stacked
   halves of the continuous Full Board. */
.h116-piles{position:absolute;inset:0;z-index:6;pointer-events:none}
.h116-piles .h116-pile{position:absolute!important;left:1.4%!important;right:auto!important;margin:0!important;pointer-events:none!important}
.h116-piles .cmds.h116-pile{display:flex!important;gap:8px!important}

/* Opponent half: normal pile spacing mapped into the top 50%. */
#h116-piles-opp .h116-cmd{top:5.75%!important}
#h116-piles-opp .h116-discard{top:14.125%!important}
#h116-piles-opp .h116-deck{top:22.5%!important}
#h116-piles-opp .h116-exile{top:30.875%!important}
#h116-piles-opp .h116-tokens{top:39.25%!important}

/* Your half: same pile spacing mapped into the lower 50%. */
#h116-piles-you .h116-cmd{top:55.75%!important}
#h116-piles-you .h116-discard{top:64.125%!important}
#h116-piles-you .h116-deck{top:72.5%!important}
#h116-piles-you .h116-exile{top:80.875%!important}
#h116-piles-you .h116-tokens{top:89.25%!important}

/* Keep pile labels readable but visually subordinate in the overview. */
.h116-piles .zone:after,.h116-piles .cmd:after{opacity:.9}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h116-fullboard-piles-card-size-script">window.addEventListener('DOMContentLoaded',()=>{
    const content=document.getElementById('h105fullcontent');
    const field=document.getElementById('field');
    const oppcards=document.getElementById('oppcards');
    const you=document.getElementById('you');
    if(!content||!field||!you)return;

    /* Match Full Board card width to the normal battlefield's real computed CSS
       width rather than maintaining a second hard-coded size. */
    const syncCardWidth=()=>{
      let sample=field.querySelector('.card')||oppcards?.querySelector('.card');
      let probe=null;
      if(!sample){
        probe=document.createElement('div');
        probe.className='card';
        probe.style.visibility='hidden';
        probe.style.pointerEvents='none';
        field.appendChild(probe);
        sample=probe;
      }
      const w=parseFloat(getComputedStyle(sample).width);
      if(probe)probe.remove();
      if(Number.isFinite(w)&&w>0)content.style.setProperty('--h116-field-card-width',w+'px');
    };

    const stripIds=node=>{
      if(node.nodeType!==1)return;
      node.removeAttribute('id');
      node.querySelectorAll?.('[id]').forEach(el=>el.removeAttribute('id'));
    };

    const makeOpponentZone=(classes,name,icon)=>{
      const el=document.createElement('div');
      el.className=classes;
      el.dataset.name=name;
      if(icon)el.dataset.icon=icon;
      return el;
    };

    const ensureLayers=()=>{
      let opp=document.getElementById('h116-piles-opp');
      let mine=document.getElementById('h116-piles-you');
      if(!opp){opp=document.createElement('div');opp.id='h116-piles-opp';opp.className='h116-piles';content.appendChild(opp)}
      if(!mine){mine=document.createElement('div');mine.id='h116-piles-you';mine.className='h116-piles';content.appendChild(mine)}
      return{opp,mine};
    };

    const buildOpponent=layer=>{
      layer.innerHTML='';
      const cmds=document.createElement('div');
      cmds.className='cmds h116-pile h116-cmd';
      const cmd=makeOpponentZone('cmd','COMMANDER','♛');
      cmds.appendChild(cmd);
      layer.appendChild(cmds);

      const discard=makeOpponentZone('zone discard h116-pile h116-discard','DISCARD','☠');
      const deck=makeOpponentZone('zone deck h116-pile h116-deck','DECK','');
      const exile=makeOpponentZone('zone exile h116-pile h116-exile','EXILE','✦');
      const tokens=makeOpponentZone('zone tokens h116-pile h116-tokens','TOKENS','◉');
      layer.append(discard,deck,exile,tokens);
    };

    const cloneYourPiles=layer=>{
      layer.innerHTML='';
      const specs=[
        ['#cmds','h116-cmd'],['#discard','h116-discard'],['#deck','h116-deck'],
        ['#exile','h116-exile'],['#tokens','h116-tokens']
      ];
      specs.forEach(([sel,pos])=>{
        const src=document.querySelector(sel);if(!src)return;
        const clone=src.cloneNode(true);stripIds(clone);
        clone.classList.add('h116-pile',pos);
        clone.querySelectorAll('button').forEach(b=>b.remove());
        layer.appendChild(clone);
      });
    };

    const layers=ensureLayers();
    buildOpponent(layers.opp);
    const refresh=()=>{cloneYourPiles(layers.mine);syncCardWidth()};
    refresh();

    const watched=['#cmds','#discard','#deck','#exile','#tokens'];
    let raf=0;
    const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(refresh)};
    watched.forEach(sel=>{const el=document.querySelector(sel);if(el)new MutationObserver(schedule).observe(el,{childList:true,subtree:true,attributes:true})});
    new MutationObserver(syncCardWidth).observe(field,{childList:true,subtree:true});
    window.addEventListener('resize',syncCardWidth,{passive:true});
    window.addEventListener('orientationchange',syncCardWidth,{passive:true});
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.v==='full')requestAnimationFrame(syncCardWidth)}));
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h115.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
