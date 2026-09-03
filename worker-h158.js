import h157 from './worker-h157.js';

const BUILD='H158';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h158-opponent-life-hand-fix'))return out;

  const css=`<style id="h158-opponent-life-hand-fix">
/* H158: keep only one opponent life control on the Opponent view and restore
   the player's normal hand bar while viewing the opponent battlefield. */
body.h157-opp-mode #opp .life-heart[data-life="opp"]{display:none!important}
body.h157-opp-mode #full .life-heart[data-life="opp"]{display:none!important}
body.h157-opp-mode #h157-opp-life{
  top:8px!important;
  bottom:auto!important;
  left:8px!important;
  right:auto!important;
}
body.h157-opp-mode #hand{display:block!important}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h157.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
