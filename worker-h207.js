import h206 from './worker-h206.js';

const BUILD='H207';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h207-fullboard-pile-shadow-specificity-fix'))return out;

  const css=`<style id="h207-fullboard-pile-shadow-specificity-fix">
/* H207: H206's global shadow removal was losing to older Full Board pile rules
   that use ID selectors plus !important. Override those exact pile selectors
   with higher specificity so both Full Board pile columns are truly flat. */
body #h116-piles-opp .zone,
body #h116-piles-opp .cmd,
body #h116-piles-you .zone,
body #h116-piles-you .cmd{
  box-shadow:none!important;
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
    const response=await h206.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
