import h205 from './worker-h205.js';

const BUILD='H206';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h206-shadow-free-ui'))return out;

  const css=`<style id="h206-shadow-free-ui">
/* H206 keeps all H205 geometry, colors, spacing, and behavior intact and removes
   visual shadow effects for a flatter, uniform presentation across every view.
   Borders/outlines remain unchanged, so player blue and opponent red identity
   still reads exactly as in H205. */
body *,
body *::before,
body *::after{
  box-shadow:none!important;
  text-shadow:none!important;
}

/* The life-heart graphics use filter:drop-shadow rather than box-shadow. Remove
   only that known shadow filter; do not globally disable filters that may be
   used elsewhere for non-shadow interaction states. */
body .life-heart::before,
body #h157-opp-life::before{
  filter:none!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h205.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
