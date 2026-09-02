import h103 from './worker-h103.js';

const BUILD='H104';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H104_SCROLL_FULL_BOARD'))return source;
  let out=source;

  // The Full Board canvas is now 200% tall: opponent occupies the first 50%
  // and the player occupies the second 50%. Because the canvas itself is twice
  // the viewport height, halving only Y preserves the original board-local Y
  // position. X can remain identical to the normal battlefield.
  out=out.replace(
    "const copy={...s,x:25+s.x*.5,y:50+s.y*.5};",
    "const copy={...s,x:s.x,y:50+s.y*.5};"
  );
  out=out.replace(
    "const copy={...s,x:25+s.x*.5,y:s.y*.5};",
    "const copy={...s,x:s.x,y:s.y*.5};"
  );

  const marker='\n/* H104_SCROLL_FULL_BOARD */\n';
  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+marker+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source.replaceAll('H103','H104').replaceAll('h103-','h104-');
  if(out.includes('h104-scroll-board-style'))return out;

  // Two invisible page blocks create real scroll/snap destinations. Cards are
  // rendered on a separate 200%-height overlay so their board coordinates can
  // remain proportional to the normal battlefield.
  out=out.replace(
    '<div id="fullcards"></div></section>',
    '<div class="h104-board-page h104-opp-page" aria-hidden="true"></div><div class="h104-board-page h104-you-page" aria-hidden="true"></div><div id="fullcards"></div></section>'
  );

  const css=`<style id="h104-scroll-board-style">
#full{
  overflow-x:hidden!important;
  overflow-y:auto!important;
  -webkit-overflow-scrolling:touch!important;
  overscroll-behavior-y:contain!important;
  scroll-snap-type:y mandatory!important;
  touch-action:pan-y!important;
}
#full:before{display:none!important}
#full .h104-board-page{
  position:relative!important;
  width:100%!important;
  height:100%!important;
  min-height:100%!important;
  scroll-snap-align:start!important;
  scroll-snap-stop:always!important;
  pointer-events:none!important;
}
#full .h104-opp-page{border-bottom:1px solid rgba(235,214,176,.38)!important}
#fullcards{
  position:absolute!important;
  left:0!important;
  right:0!important;
  top:0!important;
  bottom:auto!important;
  width:100%!important;
  height:200%!important;
  min-height:200%!important;
  z-index:8!important;
  pointer-events:none!important;
}
#fullcards .card{
  width:91px!important;
  pointer-events:auto!important;
  touch-action:manipulation!important;
}
#fullcards .card .badge{
  font-size:8px!important;
  padding:4px 5px!important;
  right:3px!important;
  bottom:4px!important;
}
/* Opponent life belongs to page one; your life belongs to page two. */
#full .life-heart[data-life="opp"]{
  left:auto!important;
  right:7px!important;
  top:6px!important;
  z-index:40!important;
}
#full .life-heart[data-life="you"]{
  left:7px!important;
  right:auto!important;
  top:calc(100% + 6px)!important;
  z-index:40!important;
}
@media(max-width:390px){
  #fullcards .card{width:91px!important}
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  // Whenever Full Board is selected after visiting another tab, start at the
  // opponent side. Normal scrolling then moves down to the player's side.
  const script=`<script id="h104-scroll-board-script">window.addEventListener('DOMContentLoaded',()=>{
    const full=document.getElementById('full');
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>{
      if(btn.dataset.v==='full'&&full)requestAnimationFrame(()=>full.scrollTo({top:0,behavior:'auto'}));
    }));
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h103.fetch(request,env,ctx);
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
