import h111 from './worker-h111.js';

const BUILD='H112';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replaceAll('H111','H112');
  if(out.includes('h112-fullboard-zone-scroll-fix'))return out;

  const css=`<style id="h112-fullboard-zone-scroll-fix">
/* Full Board has no pile column, so both land zones can use the full battlefield
   width. Keep the same vertical placement used by the existing Full Board
   mapping, but align both zones to identical left/right margins. */
#h105fullcontent::before,
#h105fullcontent::after{
  left:4%!important;
  right:4%!important;
  width:auto!important;
  height:13.5%!important;
  box-sizing:border-box!important;
}
#h105fullcontent::before{top:34%!important}
#h105fullcontent::after{top:84%!important}

/* The board itself is the scroll surface now. Remove the visible range control
   entirely so it never overlays cards or the hand. Native touch scrolling on
   the Full Board viewport remains active across the whole board. */
#h105fullscroll{
  display:none!important;
  visibility:hidden!important;
  opacity:0!important;
  pointer-events:none!important;
}
#h105fullviewport{
  touch-action:pan-y!important;
  overscroll-behavior-y:contain!important;
  -webkit-overflow-scrolling:touch!important;
}
#h105fullcontent,
#h105fullcontent #fullcards,
#h105fullcontent #fullcards .card{
  touch-action:pan-y!important;
}
@media(max-width:390px){
  #h105fullcontent::before,
  #h105fullcontent::after{left:4%!important;right:4%!important}
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h111.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
