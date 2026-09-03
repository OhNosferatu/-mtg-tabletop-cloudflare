import h197 from './worker-h197.js';

const BUILD='H199';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h199-opponent-land-specificity-fix'))return out;

  const css=`<style id="h199-opponent-land-specificity-fix">
/* H199: H172 has a higher-specificity rule that was overriding H198, so the
   Opponent land zone never actually moved. Keep the H197 stable baseline and
   override that exact selector only. The dedicated Opponent land zone now uses
   the same geometry as the current Full Board opponent land zone. */
body.h157-opp-mode #h157-opp-land{
  left:17%!important;
  right:4%!important;
  top:5%!important;
  height:27%!important;
  width:auto!important;
  border:1.5px solid rgba(145,150,156,.48)!important;
  border-radius:12px!important;
  background:rgba(130,135,140,.07)!important;
  box-shadow:inset 0 0 0 1px rgba(210,214,218,.045)!important;
  box-sizing:border-box!important;
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
