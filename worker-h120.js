import h119 from './worker-h119.js';

const BUILD='H120';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replaceAll('H119','H120');
  if(out.includes('h120-fullboard-piles'))return out;

  const css=`<style id="h120-fullboard-piles">
/* H120 keeps H119's one-to-one board/card geometry. Pile columns are also
   one-to-one: same physical size and same relative positions as Your Side. */
#h116-piles-opp,#h116-piles-you{
  position:absolute!important;
  inset:0!important;
  z-index:30!important;
  display:block!important;
  visibility:visible!important;
  opacity:1!important;
  pointer-events:none!important;
}
#h116-piles-opp .h116-pile,#h116-piles-you .h116-pile{
  position:absolute!important;
  left:1.4%!important;
  right:auto!important;
  width:var(--zone-w)!important;
  height:var(--zone-h)!important;
  margin:0!important;
  visibility:visible!important;
  opacity:1!important;
}
#h116-piles-opp .h116-pile,#h116-piles-opp .h116-pile .cmd,
#h116-piles-you .h116-pile,#h116-piles-you .h116-pile .cmd{
  pointer-events:auto!important;
}
#h116-piles-opp .cmds.h116-pile,#h116-piles-you .cmds.h116-pile{
  display:flex!important;
  gap:5px!important;
  width:auto!important;
  height:var(--zone-h)!important;
}
#h116-piles-opp .cmds.h116-pile .cmd,#h116-piles-you .cmds.h116-pile .cmd{
  position:relative!important;
  left:auto!important;
  top:auto!important;
  width:var(--zone-w)!important;
  height:var(--zone-h)!important;
}

/* Exact board-ui.css placement mapped into the top 50% opponent board. */
#h116-piles-opp .h116-cmd{top:5.75%!important}
#h116-piles-opp .h116-discard{top:14.125%!important}
#h116-piles-opp .h116-deck{top:22.5%!important}
#h116-piles-opp .h116-exile{top:30.875%!important}
#h116-piles-opp .h116-tokens{top:39.25%!important}

/* Same placement mapped into the bottom 50% player board. */
#h116-piles-you .h116-cmd{top:55.75%!important}
#h116-piles-you .h116-discard{top:64.125%!important}
#h116-piles-you .h116-deck{top:72.5%!important}
#h116-piles-you .h116-exile{top:80.875%!important}
#h116-piles-you .h116-tokens{top:89.25%!important}

#h116-piles-opp .zone,#h116-piles-opp .cmd,
#h116-piles-you .zone,#h116-piles-you .cmd{
  width:var(--zone-w)!important;
  height:var(--zone-h)!important;
  border-radius:7px!important;
}
#h116-piles-opp .zone img,#h116-piles-opp .cmd img,
#h116-piles-you .zone img,#h116-piles-you .cmd img{
  width:100%!important;
  height:100%!important;
  object-fit:cover!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h120-fullboard-piles-script">window.addEventListener('DOMContentLoaded',()=>{
    const content=document.getElementById('h105fullcontent');
    if(!content)return;

    const stripIds=node=>{if(!node||node.nodeType!==1)return;node.removeAttribute('id');node.querySelectorAll?.('[id]').forEach(el=>el.removeAttribute('id'))};
    const sourceSpecs=[['#cmds','h116-cmd'],['#discard','h116-discard'],['#deck','h116-deck'],['#exile','h116-exile'],['#tokens','h116-tokens']];

    const makeEmpty=(classes,name,icon)=>{const el=document.createElement('div');el.className=classes;el.dataset.name=name;if(icon)el.dataset.icon=icon;el.innerHTML='<span class="count">0</span>';return el};

    const fallbackYou=layer=>{
      layer.innerHTML='';
      for(const [sel,pos] of sourceSpecs){
        const src=document.querySelector(sel);if(!src)continue;
        const clone=src.cloneNode(true);stripIds(clone);clone.classList.add('h116-pile',pos);clone.querySelectorAll('button').forEach(b=>b.remove());layer.appendChild(clone);
      }
    };
    const fallbackOpp=layer=>{
      layer.innerHTML='';
      const cmds=document.createElement('div');cmds.className='cmds h116-pile h116-cmd';
      const cmd=makeEmpty('cmd','COMMANDER','♛');cmds.appendChild(cmd);layer.appendChild(cmds);
      layer.appendChild(makeEmpty('zone discard h116-pile h116-discard','DISCARD','☠'));
      layer.appendChild(makeEmpty('zone deck h116-pile h116-deck','DECK',''));
      layer.appendChild(makeEmpty('zone exile h116-pile h116-exile','EXILE','✦'));
      layer.appendChild(makeEmpty('zone tokens h116-pile h116-tokens','TOKENS','◉'));
    };
    const ensureLayer=owner=>{
      let layer=document.getElementById('h116-piles-'+owner);
      if(!layer){layer=document.createElement('div');layer.id='h116-piles-'+owner;layer.className='h116-piles h117-piles';content.appendChild(layer)}
      return layer;
    };
    const ensure=()=>{
      /* Prefer H117's real interactive pile renderer. The fallback exists only
         to guarantee the pile columns are never visually absent. */
      try{window.MTG_H117_refreshFullBoard?.()}catch{}
      requestAnimationFrame(()=>{
        const opp=ensureLayer('opp'),mine=ensureLayer('you');
        if(!mine.children.length){mine.classList.add('h120-fallback');fallbackYou(mine)}
        if(!opp.children.length){opp.classList.add('h120-fallback');fallbackOpp(opp)}
      });
    };

    ensure();
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.v==='full')requestAnimationFrame(ensure)}));

    /* If the personal piles change before the interactive renderer has taken
       ownership, keep the fallback clone current. */
    let raf=0;const refreshFallback=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const mine=document.getElementById('h116-piles-you');if(mine?.classList.contains('h120-fallback'))fallbackYou(mine)})};
    sourceSpecs.forEach(([sel])=>{const el=document.querySelector(sel);if(el)new MutationObserver(refreshFallback).observe(el,{childList:true,subtree:true,attributes:true})});
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h119.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
