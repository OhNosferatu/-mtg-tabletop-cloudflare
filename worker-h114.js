import h113 from './worker-h113.js';

const BUILD='H114';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H114_FULL_SCALE_CONTINUOUS_BOARD'))return source;
  let out=source;

  // Full Board is now two true full-size battlefield canvases stacked vertically.
  // Each half has the same width/coordinate system as its normal single-side view;
  // only Y is mapped into the opponent (top) or player (bottom) half.
  out=out.replace(
    "const copy={...s,x:2+s.x*.96,y:50+s.y*.5};",
    "const copy={...s,x:s.x,y:50+s.y*.5};"
  );
  out=out.replace(
    "const copy={...s,x:2+s.x*.96,y:s.y*.5};",
    "const copy={...s,x:s.x,y:s.y*.5};"
  );

  const marker='\n/* H114_FULL_SCALE_CONTINUOUS_BOARD */\n';
  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+marker+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source.replaceAll('H113','H114');
  if(out.includes('h114-full-scale-continuous-board'))return out;

  const css=`<style id="h114-full-scale-continuous-board">
/* Two full-size battlefields, one continuous scroll surface. The visible Full
   Board remains one normal board-height viewport; the virtual table is exactly
   two board-heights tall so neither side is vertically descaled. */
#h105fullcontent{
  height:200%!important;
  min-height:200%!important;
}

/* Full Board cards are the same physical size as cards on the normal mobile
   battlefield. Keep H107's full-card image treatment so the card face remains
   completely visible rather than returning to the old cropped thumbnail look. */
#fullcards .full-mini-card,
#fullcards .full-you-card,
#fullcards .full-opp-card{
  width:96px!important;
  height:auto!important;
  aspect-ratio:auto!important;
  overflow:visible!important;
}
#fullcards .full-mini-card>img,
#fullcards .full-you-card>img,
#fullcards .full-opp-card>img{
  width:100%!important;
  height:auto!important;
  object-fit:contain!important;
  object-position:center!important;
}

/* Land zones already use half-relative positions (13.5% of the combined table
   equals 27% of one full-size side), so at 200% height they now match the normal
   battlefield's vertical scale exactly. */
#h105fullcontent::before{top:2.5%!important}
#h105fullcontent::after{top:84%!important}

@media(max-width:600px){
  #fullcards .full-mini-card,
  #fullcards .full-you-card,
  #fullcards .full-opp-card{width:91px!important}
}
@media(min-width:700px) and (max-width:899px){
  #fullcards .full-mini-card,
  #fullcards .full-you-card,
  #fullcards .full-opp-card{width:108px!important}
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h113.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
