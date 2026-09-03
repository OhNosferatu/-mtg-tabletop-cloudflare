import h188 from './worker-h188.js';

const BUILD='H190';
const BASE_W=393;
const BASE_BOARD_H=610;
const BASE_DIVIDER_H=58;
const LAND_RATIO=.27;
const DIVIDER_RATIO=BASE_DIVIDER_H/BASE_BOARD_H;
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h190-proportional-board-geometry'))return out;

  const css=`<style id="h190-proportional-board-geometry">
/* H190: one canonical aspect ratio, scaled from board width. Nothing uses the
   changing Safari viewport height. 393px wide reproduces the approved geometry:
   610px player side, 58px divider, 164.7px land zone. */
#h105fullcontent{
  --h190-board-h:${BASE_BOARD_H}px;
  --h190-divider-h:${BASE_DIVIDER_H}px;
  --h176-board-h:var(--h190-board-h)!important;
  --h133-divider-h:var(--h190-divider-h)!important;
  height:calc((var(--h190-board-h) * 2) + var(--h190-divider-h))!important;
  min-height:calc((var(--h190-board-h) * 2) + var(--h190-divider-h))!important;
  max-height:calc((var(--h190-board-h) * 2) + var(--h190-divider-h))!important;
}
#h105fullcontent #fullcards,
#h116-piles-opp,#h116-piles-you{
  height:calc(var(--h190-board-h) * 2)!important;
  min-height:calc(var(--h190-board-h) * 2)!important;
  max-height:calc(var(--h190-board-h) * 2)!important;
}
#h105divider{
  height:var(--h190-divider-h)!important;
  min-height:var(--h190-divider-h)!important;
  max-height:var(--h190-divider-h)!important;
}
#h105fullcontent .h133-land-zone{
  height:calc(var(--h190-board-h) * ${LAND_RATIO})!important;
  min-height:calc(var(--h190-board-h) * ${LAND_RATIO})!important;
  max-height:calc(var(--h190-board-h) * ${LAND_RATIO})!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h190-proportional-board-geometry">window.addEventListener('DOMContentLoaded',()=>{
    const content=document.getElementById('h105fullcontent');
    if(!content)return;
    let raf=0;
    const layout=()=>{
      cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
        const width=Math.max(1,content.clientWidth||document.documentElement.clientWidth||${BASE_W});
        const scale=width/${BASE_W};
        const boardH=${BASE_BOARD_H}*scale;
        const dividerH=boardH*${DIVIDER_RATIO};
        const totalH=(boardH*2)+dividerH;
        content.style.setProperty('--h190-board-h',boardH+'px');
        content.style.setProperty('--h190-divider-h',dividerH+'px');
        content.style.setProperty('height',totalH+'px','important');
        content.style.setProperty('min-height',totalH+'px','important');
        content.style.setProperty('max-height',totalH+'px','important');

        const oppLand=content.querySelector('.h133-land-opp');
        const youLand=content.querySelector('.h133-land-you');
        const landH=boardH*${LAND_RATIO};
        if(oppLand){oppLand.style.setProperty('top',(boardH*.05)+'px','important');oppLand.style.setProperty('height',landH+'px','important')}
        if(youLand){youLand.style.setProperty('top',(boardH+dividerH+(boardH*.68))+'px','important');youLand.style.setProperty('height',landH+'px','important')}

        /* Re-apply the approved H186 pile slots using the same scaled geometry. */
        const oppOrder={tokens:.135,graveyard:.30,deck:.465,exile:.63,cmd:.795};
        const youOrder={cmd:.135,exile:.30,deck:.465,graveyard:.63,tokens:.795};
        const place=(owner,map,base)=>{
          const layer=document.getElementById('h116-piles-'+owner);if(!layer)return;
          layer.style.setProperty('height',(boardH*2)+'px','important');
          layer.style.setProperty('translate','none','important');
          layer.style.setProperty('transform','none','important');
          for(const [zone,f] of Object.entries(map))layer.querySelectorAll('[data-h117-zone="'+zone+'"]').forEach(el=>{
            el.style.setProperty('top',(base+boardH*f)+'px','important');
            el.style.setProperty('left','1.4%','important');
            el.style.setProperty('translate','none','important');
            el.style.setProperty('transform','none','important');
          });
        };
        place('opp',oppOrder,0);place('you',youOrder,boardH+dividerH);
        window.MTG_H168_manaLifecycle?.render?.();
      });
    };
    layout();setTimeout(layout,100);setTimeout(layout,250);
    window.addEventListener('resize',layout,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(layout,100),{passive:true});
    window.addEventListener('pageshow',layout);
    new ResizeObserver(layout).observe(content);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD,geometry:{baseWidthPx:BASE_W,basePlayerSidePx:BASE_BOARD_H,baseDividerPx:BASE_DIVIDER_H,landRatio:LAND_RATIO,scaling:'proportional-by-board-width'}}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h188.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
