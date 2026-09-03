import h202 from './worker-h202.js';

const BUILD='H203';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h203-opponent-piles-mirrored-edge-spacing'))return out;

  const css=`<style id="h203-opponent-piles-mirrored-edge-spacing">
/* H203 keeps H202 intact and changes only opponent pile vertical anchoring.
   Player Commander begins 13.5% down from the top edge. Mirror that exactly:
   opponent Commander ends 13.5% up from the bottom edge, then Exile, Deck,
   Graveyard, and Tokens keep the same 16.5% slot spacing moving upward. */
body.h157-opp-mode #h157-opp-piles .h157-cmd{
  top:auto!important;bottom:13.5%!important;
}
body.h157-opp-mode #h157-opp-piles .h157-exile{
  top:auto!important;bottom:30%!important;
}
body.h157-opp-mode #h157-opp-piles .h157-deck{
  top:auto!important;bottom:46.5%!important;
}
body.h157-opp-mode #h157-opp-piles .h157-graveyard{
  top:auto!important;bottom:63%!important;
}
body.h157-opp-mode #h157-opp-piles .h157-tokens{
  top:auto!important;bottom:79.5%!important;
}

/* Full Board's opponent pile layer spans exactly two battlefield heights.
   Its upper-board bottom is the layer midpoint, so add half of the dedicated
   opponent bottom offsets to 50%. This preserves the exact mirrored spacing
   without depending on the physical pile-card height. */
#h116-piles-opp>[data-h117-zone="cmd"],
#h116-piles-opp>.h116-cmd{
  top:auto!important;bottom:56.75%!important;
}
#h116-piles-opp>[data-h117-zone="exile"],
#h116-piles-opp>.h116-exile{
  top:auto!important;bottom:65%!important;
}
#h116-piles-opp>[data-h117-zone="deck"],
#h116-piles-opp>.h116-deck{
  top:auto!important;bottom:73.25%!important;
}
#h116-piles-opp>[data-h117-zone="graveyard"],
#h116-piles-opp>.h116-graveyard{
  top:auto!important;bottom:81.5%!important;
}
#h116-piles-opp>[data-h117-zone="tokens"],
#h116-piles-opp>.h116-tokens{
  top:auto!important;bottom:89.75%!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h202.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
