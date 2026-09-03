import h209 from './worker-h209.js';

const BUILD='H210';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h210-fullboard-card-shadow-specificity-fix'))return out;

  const css=`<style id="h210-fullboard-card-shadow-specificity-fix">
/* H210: older Full Board card rules apply filter:drop-shadow with !important,
   so the broad H206 shadow cleanup cannot win. Target the exact Full Board card
   selectors with higher specificity. This affects only resting battlefield-card
   presentation; H124's temporary long-press selection highlight remains intact. */
body #fullcards .card,
body #fullcards .full-mini-card,
body #fullcards .full-you-card,
body #fullcards .full-opp-card{
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
    const response=await h209.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
