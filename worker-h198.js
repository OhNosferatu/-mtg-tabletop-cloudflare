import h197 from './worker-h197.js';

const BUILD='H198';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h198-match-opponent-land-zone'))return out;

  const css=`<style id="h198-match-opponent-land-zone">
/* H198: keep H197 untouched and make the dedicated Opponent-screen land zone
   use the exact same geometry as the opponent land zone on Full Board. */
#h157-opp-land{
  left:16%!important;
  right:5%!important;
  top:5%!important;
  height:27%!important;
  width:auto!important;
  border:1.5px solid rgba(145,150,156,.48)!important;
  border-radius:12px!important;
  background:rgba(130,135,140,.07)!important;
  box-shadow:inset 0 0 0 1px rgba(210,214,218,.045)!important;
  box-sizing:border-box!important;
}
@media(max-width:390px){
  #h157-opp-land{right:4%!important}
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h197.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
