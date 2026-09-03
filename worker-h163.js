import h162 from './worker-h162.js';

const BUILD='H163';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h163-inventory-scroll'))return out;

  const css=`<style id="h163-inventory-scroll">
/* H163: lock the approved Inventory window size and give only the innermost
   inventory area a subtle floating scrollbar when content eventually overflows. */
#h162inventory .h162-inventory-body{
  height:190px!important;
  min-height:190px!important;
  max-height:190px!important;
  overflow-y:auto!important;
  overflow-x:hidden!important;
  align-items:flex-start!important;
  justify-content:flex-start!important;
  scrollbar-width:thin;
  scrollbar-color:#8b7659 transparent;
  padding-right:14px!important;
}
#h162inventory .h162-inventory-body::-webkit-scrollbar{width:7px}
#h162inventory .h162-inventory-body::-webkit-scrollbar-track{background:transparent}
#h162inventory .h162-inventory-body::-webkit-scrollbar-thumb{
  background:#8b7659;
  border-radius:999px;
  border:2px solid #14110f;
}
#h162inventory .h162-inventory-body::-webkit-scrollbar-thumb:active{background:#d3ad70}
@media(min-width:900px){
  #h162inventory .h162-inventory-body{
    height:260px!important;
    min-height:260px!important;
    max-height:260px!important;
  }
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h162.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
