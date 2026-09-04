import h228 from './worker-h228.js';

const BUILD='H229';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h229-opponent-tap-origin-parity'))return out;

  const css=`<style id="h229-opponent-tap-origin-parity">
/* H229: opponent cards were keeping the same stored x/y between dedicated
   Opponent and Full Board, but H178 forced Full Board opponent cards to rotate
   around their top-left corner while dedicated #oppcards uses the normal center
   transform origin. That makes a tapped (90deg) card look like it jumped even
   though its coordinates did not change. Use the same center origin in both
   views. Untapped card geometry is unaffected. */
#oppcards .card,
#fullcards .h117-full-card[data-h117-owner="opp"]{
  transform-origin:50% 50%!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h228.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
