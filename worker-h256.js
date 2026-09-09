import h255 from './worker-h255.js';

const BUILD='H256';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformStyle(source){
  let out=source;
  /* The base stylesheet creates the deck back as a pseudo-element regardless of
     pile state. Make that rule conditional at its source instead of relying only
     on a later override. An empty deck therefore has no pseudo-card to paint. */
  out=out.replace(/\.deck:before\{content:"";z-index:3;background:#111 url\("https:\/\/cards\.scryfall\.io\/back\.png"\) center\/cover no-repeat;border-radius:6px\}/g,
    '.deck:not(.empty):before{content:"";z-index:3;background:#111 url("https://cards.scryfall.io/back.png") center/cover no-repeat;border-radius:6px}');
  out+='\n/* H256_EMPTY_DECK_SOURCE_RULE */\n.deck.empty::before{display:none!important;content:none!important;background:none!important}\n.deck.empty>img{display:none!important}\n';
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h256-empty-deck-source-rule'))return out;
  const css=`<style id="h256-empty-deck-source-rule">
/* Belt-and-suspenders fallback for any dynamically injected deck styling. */
.deck.empty::before,
#deck.empty::before,
#h116-piles-you .deck.empty::before,
#h116-piles-opp .deck.empty::before,
#h157-opp-piles .deck.empty::before{
  display:none!important;
  content:none!important;
  background:none!important;
}
.deck.empty>img,
#deck.empty>img,
#h116-piles-you .deck.empty>img,
#h116-piles-opp .deck.empty>img,
#h157-opp-piles .deck.empty>img{display:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');
  const script=`<script id="h256-empty-deck-state-sync">window.addEventListener('DOMContentLoaded',()=>{
    const clean=()=>window.MTG_H254_clearEmptyDeckArtwork?.();
    clean();requestAnimationFrame(clean);setTimeout(clean,80);
  });</script>`;
  out=out.replace('</body>',script+'\n<!-- h256-empty-deck-source-rule -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h255.fetch(request,env,ctx);
    if(url.pathname==='/style.css'){
      const text=await response.text();
      return new Response(transformStyle(text),{status:response.status,headers:headers('text/css; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
