import h215 from './worker-h215.js';

const BUILD='H216';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h216-player-piles-measured-from-fullboard'))return out;

  const script=`<script id="h216-player-piles-measured-from-fullboard">window.addEventListener('DOMContentLoaded',()=>{
    /* H216 stops guessing a percentage for the dedicated Your Side pile column.
       Measure each confirmed Full Board player pile's actual left-edge distance
       from its own pile layer, then apply that exact pixel distance to the matching
       pile on Your Side. Full Board remains the source of truth. */
    const full=document.getElementById('full');
    const layer=document.getElementById('h116-piles-you');
    const you=document.getElementById('you');
    if(!full||!layer||!you)return;

    const pairs=[
      ['#cmds','[data-h117-zone="cmd"],.h116-cmd'],
      ['#exile','[data-h117-zone="exile"],.h116-exile'],
      ['#deck','[data-h117-zone="deck"],.h116-deck'],
      ['#graveyard','[data-h117-zone="graveyard"],.h116-graveyard'],
      ['#tokens','[data-h117-zone="tokens"],.h116-tokens']
    ];

    let raf=0;
    const measure=()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const oldStyle=full.getAttribute('style');
        const hidden=getComputedStyle(full).display==='none'||full.getBoundingClientRect().width===0;
        if(hidden){
          full.style.setProperty('display','block','important');
          full.style.setProperty('visibility','hidden','important');
          full.style.setProperty('pointer-events','none','important');
        }

        /* Force layout only while hidden; this occurs in one frame and is restored
           before paint, so the user never sees Full Board flash on screen. */
        const lr=layer.getBoundingClientRect();
        if(lr.width>0){
          for(const [youSel,fullSel] of pairs){
            const src=layer.querySelector(fullSel),dst=you.querySelector(youSel);
            if(!src||!dst)continue;
            const sr=src.getBoundingClientRect();
            if(!sr.width)continue;
            const gap=Math.max(0,sr.left-lr.left);
            dst.style.setProperty('left',gap+'px','important');
          }
        }

        if(hidden){
          if(oldStyle===null)full.removeAttribute('style');
          else full.setAttribute('style',oldStyle);
        }
      });
    };

    /* Measure once at startup, then refresh from the real visible Full Board on
       tab changes or viewport changes. No pile heights, tops, spacing or behavior
       are touched. */
    measure();
    setTimeout(measure,80);
    document.querySelector('[data-v="full"]')?.addEventListener('click',()=>requestAnimationFrame(measure));
    document.querySelector('[data-v="you"]')?.addEventListener('click',measure);
    window.addEventListener('resize',measure,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(measure,80),{passive:true});
    window.addEventListener('pageshow',()=>setTimeout(measure,50));
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h215.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
