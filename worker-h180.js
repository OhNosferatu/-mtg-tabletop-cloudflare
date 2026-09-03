import h179 from './worker-h179.js';

const BUILD='H180';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h180-fullboard-pile-geometry'))return out;

  const css=`<style id="h180-fullboard-pile-geometry">
/* H180: Full Board is now the only battlefield, so its pile columns get one
   authoritative geometry. Target semantic data attributes instead of legacy
   class names so Graveyard/Discard renames cannot create duplicate positions. */
#h116-piles-opp,#h116-piles-you{
  position:absolute!important;
  inset:0!important;
  height:calc(var(--h176-board-h,610px) * 2)!important;
  min-height:calc(var(--h176-board-h,610px) * 2)!important;
  max-height:calc(var(--h176-board-h,610px) * 2)!important;
  pointer-events:none!important;
}
#h116-piles-opp>[data-h117-zone],#h116-piles-you>[data-h117-zone]{
  position:absolute!important;
  left:1.4%!important;
  right:auto!important;
  margin:0!important;
}
/* Opponent half, top to bottom: Tokens -> Graveyard -> Deck -> Exile -> Commander. */
#h116-piles-opp>[data-h117-zone="tokens"]{top:6.75%!important}
#h116-piles-opp>[data-h117-zone="graveyard"]{top:15%!important}
#h116-piles-opp>[data-h117-zone="deck"]{top:23.25%!important}
#h116-piles-opp>[data-h117-zone="exile"]{top:31.5%!important}
#h116-piles-opp>[data-h117-zone="cmd"]{top:39.75%!important}
/* Player half, top to bottom: Commander -> Exile -> Deck -> Graveyard -> Tokens. */
#h116-piles-you>[data-h117-zone="cmd"]{top:56.75%!important}
#h116-piles-you>[data-h117-zone="exile"]{top:65%!important}
#h116-piles-you>[data-h117-zone="deck"]{top:73.25%!important}
#h116-piles-you>[data-h117-zone="graveyard"]{top:81.5%!important}
#h116-piles-you>[data-h117-zone="tokens"]{top:89.75%!important}

/* Remove all legacy pseudo-land/boundary drawings that can leak through as a
   full-width green horizontal rule. H133's real land-zone elements remain. */
#h105fullcontent::before,#h105fullcontent::after{
  display:none!important;
  content:none!important;
  border:0!important;
  background:none!important;
  box-shadow:none!important;
}
/* Keep the real land zones neutral and confined to the playable card area. */
#h105fullcontent .h133-land-zone{
  left:17%!important;
  right:4%!important;
  width:auto!important;
  border:1.5px solid rgba(145,150,156,.48)!important;
  background:rgba(130,135,140,.07)!important;
  box-shadow:inset 0 0 0 1px rgba(210,214,218,.045)!important;
}

/* Canonical pile-label appearance for both halves. */
#h116-piles-opp .zone::after,#h116-piles-opp .cmd::after,
#h116-piles-you .zone::after,#h116-piles-you .cmd::after{
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;
  font-size:7px!important;
  font-weight:900!important;
  line-height:1!important;
  letter-spacing:.08em!important;
  color:rgba(224,228,232,.88)!important;
  text-transform:uppercase!important;
  bottom:-14px!important;
  opacity:1!important;
  white-space:nowrap!important;
  text-shadow:none!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h180-fullboard-pile-geometry">window.addEventListener('DOMContentLoaded',()=>{
    const content=document.getElementById('h105fullcontent');
    if(!content)return;
    const normalize=()=>{
      for(const owner of['opp','you']){
        const layer=document.getElementById('h116-piles-'+owner);if(!layer)continue;
        layer.querySelectorAll('[data-h117-zone]').forEach(el=>{
          if(el.dataset.h117Zone==='graveyard')el.dataset.name='GRAVEYARD';
        });
      }
      window.MTG_H168_manaLifecycle?.render?.();
    };
    requestAnimationFrame(normalize);setTimeout(normalize,80);
    window.addEventListener('resize',normalize,{passive:true});
    window.addEventListener('pageshow',normalize);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h179.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
