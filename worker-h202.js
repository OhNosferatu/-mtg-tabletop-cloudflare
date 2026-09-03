import h201 from './worker-h201.js';

const BUILD='H202';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h202-opponent-pile-parity'))return out;

  const css=`<style id="h202-opponent-pile-parity">
/* H202 mirrors the H201 player-side parity approach for the opponent. The
   dedicated Opponent screen is the one-board source of truth:
   Tokens 13.5 / Graveyard 30 / Deck 46.5 / Exile 63 / Commander 79.5.
   Full Board maps those same slots into the upper half by halving each value. */
body.h157-opp-mode #h157-opp-piles .h157-tokens{top:13.5%!important;left:1.4%!important}
body.h157-opp-mode #h157-opp-piles .h157-graveyard{top:30%!important;left:1.4%!important}
body.h157-opp-mode #h157-opp-piles .h157-deck{top:46.5%!important;left:1.4%!important}
body.h157-opp-mode #h157-opp-piles .h157-exile{top:63%!important;left:1.4%!important}
body.h157-opp-mode #h157-opp-piles .h157-cmd{top:79.5%!important;left:1.4%!important}

#h116-piles-opp>[data-h117-zone="tokens"],
#h116-piles-opp>.h116-tokens{top:6.75%!important;left:1.4%!important}
#h116-piles-opp>[data-h117-zone="graveyard"],
#h116-piles-opp>.h116-graveyard{top:15%!important;left:1.4%!important}
#h116-piles-opp>[data-h117-zone="deck"],
#h116-piles-opp>.h116-deck{top:23.25%!important;left:1.4%!important}
#h116-piles-opp>[data-h117-zone="exile"],
#h116-piles-opp>.h116-exile{top:31.5%!important;left:1.4%!important}
#h116-piles-opp>[data-h117-zone="cmd"],
#h116-piles-opp>.h116-cmd{top:39.75%!important;left:1.4%!important}

/* One exact neutral-gray label treatment on the dedicated Opponent screen and
   the Full Board opponent half. This intentionally overrides the older red
   opponent-label rule while keeping red pile borders and board accents. */
body #h157-opp-piles .zone::after,
body #h157-opp-piles .cmd::after,
body #h116-piles-opp .zone::after,
body #h116-piles-opp .cmd::after{
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
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h201.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
