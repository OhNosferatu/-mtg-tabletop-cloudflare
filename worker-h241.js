import h240 from './worker-h240.js';

const BUILD='H241';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h241-opponent-corner-parity'))return out;

  const css=`<style id="h241-opponent-corner-parity">
/* The dedicated Opponent card shape is the visual source of truth. Because
   H240 already guarantees one-to-one card sizing across all battlefield views,
   the same physical corner radius now produces the same amount of clipping on
   Your Side and Full Board as it does on Opponent. */
#field .card,
#oppcards .card,
#fullcards .card{
  border-radius:7px!important;
  overflow:hidden!important;
}

/* Let the shared outer card wrapper perform the clip exactly once. Avoid a
   second nested radius on the image, which can make one view appear more cut
   than another even when the outer card dimensions are identical. */
#field .card>img,
#oppcards .card>img,
#fullcards .card>img{
  border-radius:0!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  out=out.replace('</body>','\n<!-- h241-opponent-corner-parity -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h240.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
