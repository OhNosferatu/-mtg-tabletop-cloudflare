import h190 from './worker-h190.js';

const BUILD='H192';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h192-authoritative-pile-slots'))return out;

  const css=`<style id="h192-authoritative-pile-slots">
/* H192: use semantic data-h117-zone attributes, not legacy class names.
   H151 renamed discard->graveyard in the live DOM, so class-based H191 rules
   did not match consistently. These rules remain valid across every rerender. */
#h116-piles-opp,#h116-piles-you{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:calc((var(--h190-board-h) * 2) + var(--h190-divider-h))!important;
  min-height:calc((var(--h190-board-h) * 2) + var(--h190-divider-h))!important;
  max-height:calc((var(--h190-board-h) * 2) + var(--h190-divider-h))!important;
  translate:none!important;
  transform:none!important;
  pointer-events:none!important;
}
#h116-piles-opp>[data-h117-zone],#h116-piles-you>[data-h117-zone]{
  position:absolute!important;
  left:1.4%!important;
  right:auto!important;
  margin:0!important;
  translate:none!important;
  transform:none!important;
}
/* Opponent slots. */
#h116-piles-opp>[data-h117-zone="tokens"]{top:calc(var(--h190-board-h) * .135)!important}
#h116-piles-opp>[data-h117-zone="graveyard"]{top:calc(var(--h190-board-h) * .30)!important}
#h116-piles-opp>[data-h117-zone="deck"]{top:calc(var(--h190-board-h) * .465)!important}
#h116-piles-opp>[data-h117-zone="exile"]{top:calc(var(--h190-board-h) * .63)!important}
#h116-piles-opp>[data-h117-zone="cmd"]{top:calc(var(--h190-board-h) * .795)!important}
/* Player slots. */
#h116-piles-you>[data-h117-zone="cmd"]{top:calc(var(--h190-board-h) + var(--h190-divider-h) + (var(--h190-board-h) * .135))!important}
#h116-piles-you>[data-h117-zone="exile"]{top:calc(var(--h190-board-h) + var(--h190-divider-h) + (var(--h190-board-h) * .30))!important}
#h116-piles-you>[data-h117-zone="deck"]{top:calc(var(--h190-board-h) + var(--h190-divider-h) + (var(--h190-board-h) * .465))!important}
#h116-piles-you>[data-h117-zone="graveyard"]{top:calc(var(--h190-board-h) + var(--h190-divider-h) + (var(--h190-board-h) * .63))!important}
#h116-piles-you>[data-h117-zone="tokens"]{top:calc(var(--h190-board-h) + var(--h190-divider-h) + (var(--h190-board-h) * .795))!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h192-authoritative-pile-slots">window.addEventListener('DOMContentLoaded',()=>{
    const content=document.getElementById('h105fullcontent');if(!content)return;
    let raf=0;
    const apply=()=>{
      cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
        const boardH=parseFloat(getComputedStyle(content).getPropertyValue('--h190-board-h'))||610;
        const dividerH=parseFloat(getComputedStyle(content).getPropertyValue('--h190-divider-h'))||58;
        const maps={
          opp:{tokens:.135,graveyard:.30,deck:.465,exile:.63,cmd:.795},
          you:{cmd:.135,exile:.30,deck:.465,graveyard:.63,tokens:.795}
        };
        for(const owner of ['opp','you']){
          const layer=document.getElementById('h116-piles-'+owner);if(!layer)continue;
          layer.style.setProperty('height',((boardH*2)+dividerH)+'px','important');
          const base=owner==='you'?boardH+dividerH:0;
          for(const [zone,f] of Object.entries(maps[owner])){
            layer.querySelectorAll('[data-h117-zone="'+zone+'"]').forEach(el=>{
              el.style.setProperty('top',(base+boardH*f)+'px','important');
              el.style.setProperty('left','1.4%','important');
              el.style.setProperty('translate','none','important');
              el.style.setProperty('transform','none','important');
              if(zone==='graveyard')el.dataset.name='GRAVEYARD';
            });
          }
        }
      });
    };
    const watch=()=>{
      for(const id of ['h116-piles-opp','h116-piles-you']){
        const layer=document.getElementById(id);if(!layer||layer.dataset.h192Watch)return;
        layer.dataset.h192Watch='1';
        new MutationObserver(apply).observe(layer,{childList:true});
      }
      apply();
    };
    watch();setTimeout(watch,50);setTimeout(watch,150);setTimeout(watch,400);
    document.getElementById('mulligan')?.addEventListener('click',()=>{requestAnimationFrame(apply);setTimeout(apply,30);setTimeout(apply,120)});
    window.addEventListener('pageshow',()=>{watch();apply()});
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h190.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
