import h213 from './worker-h213.js';

const BUILD='H214';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h214-player-pile-horizontal-parity'))return out;

  const css=`<style id="h214-player-pile-horizontal-parity">
/* H214 follows the same parity approach that worked on the opponent side:
   keep Full Board as the visual anchor and adjust only the dedicated Your Side
   pile column until both screens share the same apparent horizontal position.
   Vertical spacing/order and all pile behavior remain unchanged. */
body #you #cmds,
body #you #exile,
body #you #deck,
body #you #graveyard,
body #you #tokens{
  left:3%!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h213.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
