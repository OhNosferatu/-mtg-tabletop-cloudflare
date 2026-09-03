import h184 from './worker-h184.js';

const BUILD='H185';
const DIVIDER=58;
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h185-exact-pile-anchors'))return out;

  const css=`<style id="h185-exact-pile-anchors">
/* H185: stop mapping piles through a shared 200%-high percentage plane.
   Both pile layers span the full content, with every pile anchored directly
   to its owner's one-board coordinate system. This removes cross-half overlap. */
#h116-piles-opp,#h116-piles-you{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  min-height:0!important;
  max-height:none!important;
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
/* Opponent board: Tokens -> Graveyard -> Deck -> Exile -> Commander. */
#h116-piles-opp>[data-h117-zone="tokens"]{top:calc(var(--h176-board-h,610px) * .135)!important}
#h116-piles-opp>[data-h117-zone="graveyard"]{top:calc(var(--h176-board-h,610px) * .30)!important}
#h116-piles-opp>[data-h117-zone="deck"]{top:calc(var(--h176-board-h,610px) * .465)!important}
#h116-piles-opp>[data-h117-zone="exile"]{top:calc(var(--h176-board-h,610px) * .63)!important}
#h116-piles-opp>[data-h117-zone="cmd"]{top:calc(var(--h176-board-h,610px) * .795)!important}
/* Your board: Commander -> Exile -> Deck -> Graveyard -> Tokens. */
#h116-piles-you>[data-h117-zone="cmd"]{top:calc(var(--h176-board-h,610px) + ${DIVIDER}px + (var(--h176-board-h,610px) * .135))!important}
#h116-piles-you>[data-h117-zone="exile"]{top:calc(var(--h176-board-h,610px) + ${DIVIDER}px + (var(--h176-board-h,610px) * .30))!important}
#h116-piles-you>[data-h117-zone="deck"]{top:calc(var(--h176-board-h,610px) + ${DIVIDER}px + (var(--h176-board-h,610px) * .465))!important}
#h116-piles-you>[data-h117-zone="graveyard"]{top:calc(var(--h176-board-h,610px) + ${DIVIDER}px + (var(--h176-board-h,610px) * .63))!important}
#h116-piles-you>[data-h117-zone="tokens"]{top:calc(var(--h176-board-h,610px) + ${DIVIDER}px + (var(--h176-board-h,610px) * .795))!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h185-exact-pile-anchors">window.addEventListener('DOMContentLoaded',()=>{
    const normalize=()=>{
      for(const owner of['opp','you']){
        const layer=document.getElementById('h116-piles-'+owner);if(!layer)continue;
        layer.querySelectorAll('[data-h117-zone="graveyard"]').forEach(el=>el.dataset.name='GRAVEYARD');
      }
    };
    requestAnimationFrame(normalize);setTimeout(normalize,80);
    window.addEventListener('pageshow',normalize);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h184.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
