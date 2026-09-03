import h200 from './worker-h200.js';

const BUILD='H201';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h201-player-pile-parity'))return out;

  const css=`<style id="h201-player-pile-parity">
/* H201 keeps H200 as the stable baseline. The dedicated Your Side pile slots
   are the one-board source of truth: 13.5 / 30 / 46.5 / 63 / 79.5 percent.
   H133 keeps the Full Board pile layer exactly two battlefield-heights tall and
   translates the player layer past the 58px divider, so the matching lower-half
   positions are 50% + one-half of each one-board percentage. */
#h116-piles-you>[data-h117-zone="cmd"],
#h116-piles-you>.h116-cmd{top:56.75%!important;left:2%!important}
#h116-piles-you>[data-h117-zone="exile"],
#h116-piles-you>.h116-exile{top:65%!important;left:2%!important}
#h116-piles-you>[data-h117-zone="deck"],
#h116-piles-you>.h116-deck{top:73.25%!important;left:2%!important}
#h116-piles-you>[data-h117-zone="graveyard"],
#h116-piles-you>.h116-graveyard{top:81.5%!important;left:2%!important}
#h116-piles-you>[data-h117-zone="tokens"],
#h116-piles-you>.h116-tokens{top:89.75%!important;left:2%!important}

/* Use one exact pile-label treatment on Your Side and the Full Board player half.
   Higher specificity intentionally overrides the older blue player-label rule. */
body #you .zone::after,
body #you .cmd::after,
body #h116-piles-you .zone::after,
body #h116-piles-you .cmd::after{
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
    const response=await h200.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
