import h112 from './worker-h112.js';

const BUILD='H113';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replaceAll('H112','H113');
  if(out.includes('h113-opponent-land-zone-position'))return out;

  const css=`<style id="h113-opponent-land-zone-position">
/* Mirror the player's land zone across the center divider. The player's zone
   sits near the bottom of the lower half, so the opponent zone belongs near
   the top of the upper half rather than directly above the divider. */
#h105fullcontent::before{
  top:2.5%!important;
}
#h105fullcontent::after{
  top:84%!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h112.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
