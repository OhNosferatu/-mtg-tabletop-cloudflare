import h204 from './worker-h204.js';

const BUILD='H205';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h205-pile-outline-color-parity'))return out;

  const css=`<style id="h205-pile-outline-color-parity">
/* H205 keeps H204 geometry/shadow behavior intact and standardizes only the
   pile outline colors across dedicated and Full Board views. */
body.h157-opp-mode #h157-opp-piles .zone,
body.h157-opp-mode #h157-opp-piles .cmd,
body #h116-piles-opp .zone,
body #h116-piles-opp .cmd{
  border-color:rgba(220,65,65,.62)!important;
}

/* Player outlines were already visually aligned, but pin both views to the
   exact same blue so future inherited rules cannot drift them apart. */
body #you .zone,
body #you .cmd,
body #h116-piles-you .zone,
body #h116-piles-you .cmd{
  border-color:rgba(63,141,255,.62)!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h204.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
