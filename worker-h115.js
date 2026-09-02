import h114 from './worker-h114.js';

const BUILD='H115';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replaceAll('H114','H115');
  if(out.includes('h115-fullboard-life-sections'))return out;

  const css=`<style id="h115-fullboard-life-sections">
/* Full Board is two full-size battlefields stacked vertically. Put each life
   indicator in the same top-right location it occupies in the normal side view
   so each 50% half reads as a complete, full-size battlefield. */
#h105fullcontent .life-heart[data-life="opp"]{
  left:auto!important;
  right:7px!important;
  top:6px!important;
  bottom:auto!important;
}
#h105fullcontent .life-heart[data-life="you"]{
  left:auto!important;
  right:7px!important;
  top:calc(50% + 6px)!important;
  bottom:auto!important;
}

/* Keep the center divider exactly between the two full-size side canvases. */
#h105divider{top:50%!important}

/* Reassert the exact two-board geometry. Each half is one full viewport high,
   matching Your Side / Opponent with no additional scale factor. */
#h105fullcontent{
  height:200%!important;
  min-height:200%!important;
}

@media(max-width:390px){
  #h105fullcontent .life-heart[data-life="opp"]{right:7px!important;top:6px!important}
  #h105fullcontent .life-heart[data-life="you"]{right:7px!important;top:calc(50% + 6px)!important}
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h114.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
