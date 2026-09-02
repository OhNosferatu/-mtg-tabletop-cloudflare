import h118 from './worker-h118.js';

const BUILD='H119';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function replaceBlock(source,startToken,endToken,replacement){
  const start=source.indexOf(startToken);
  const end=source.indexOf(endToken,start);
  if(start<0||end<0)return source;
  return source.slice(0,start)+replacement+source.slice(end);
}

function transformApp(source){
  if(source.includes('H119_ONE_TO_ONE_FULL_BOARD'))return source;
  let out=source;

  /* Full Board is no longer allowed to invent a second battlefield geometry.
     Each 50% half of the 200% scroll canvas is literally one normal board.
     #field/#oppcards already fill their normal screens edge-to-edge, so the
     same stored x/y percentages can be used directly in Full Board. */
  out=replaceBlock(out,'function h118Geometry(owner){','function h118CardPixels(){',`
/* H119_ONE_TO_ONE_FULL_BOARD */
function h118Geometry(owner){
  return{fieldLeft:0,fieldTop:0,fieldWidth:1,fieldHeight:1};
}
`);

  out=replaceBlock(out,'function h118FullPosition(c,owner){','function h118CommitFullTopLeft',`
function h118FullPosition(c,owner){
  return{x:c.x,y:owner==='you'?50+c.y*.5:c.y*.5};
}
`);

  out=replaceBlock(out,'function h118CommitFullTopLeft(c,owner,leftClient,topClient,w,h){','function h118MakeDragGhost',`
function h118CommitFullTopLeft(c,owner,leftClient,topClient,w,h){
  const half=h117HalfRect(owner);if(!half||!c)return;
  const cardW=(w/Math.max(1,half.width))*100;
  const cardH=(h/Math.max(1,half.height))*100;
  c.x=Math.max(0,Math.min(Math.max(0,100-cardW),(leftClient-half.left)/half.width*100));
  c.y=Math.max(0,Math.min(Math.max(0,100-cardH),(topClient-half.top)/half.height*100));
}
`);

  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+'\n/* H119_ONE_TO_ONE_FULL_BOARD_END */\n'+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source.replaceAll('H118','H119');
  if(out.includes('h119-one-to-one-full-board'))return out;

  const css=`<style id="h119-one-to-one-full-board">
/* One-to-one Full Board geometry.
   The viewport is the exact same board rectangle used by Your Side/Opponent.
   The scroll content is exactly two of those rectangles stacked vertically. */
#h105fullviewport{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
}
#h105fullcontent{
  position:relative!important;
  width:100%!important;
  height:200%!important;
  min-height:200%!important;
}
#h105divider{top:50%!important}

/* Stop all Full Board card scaling. Use the exact same global card dimensions
   as Your Side. These variables already respond to short screens/tablets. */
#fullcards .card,
#fullcards .full-mini-card,
#fullcards .full-you-card,
#fullcards .full-opp-card,
#fullcards .h117-full-card{
  width:var(--card-w)!important;
  height:var(--card-h)!important;
  min-width:var(--card-w)!important;
  max-width:var(--card-w)!important;
  aspect-ratio:auto!important;
  transform-origin:center center!important;
}

/* Keep the complete card face visible in Full Board while preserving the same
   outer card dimensions as Your Side. */
#fullcards .card>img,
#fullcards .full-mini-card>img,
#fullcards .full-you-card>img,
#fullcards .full-opp-card>img,
#fullcards .h117-full-card>img{
  width:100%!important;
  height:100%!important;
  object-fit:contain!important;
  object-position:center!important;
}

/* Piles are already positioned as exact half-mapped copies of board-ui.css.
   Reassert their normal physical dimensions instead of any overview sizing. */
.h116-piles .zone,
.h116-piles .cmd{
  width:var(--zone-w)!important;
  height:var(--zone-h)!important;
}

/* The land zones are one normal 27%-tall land area per half. */
#h105fullcontent::before,
#h105fullcontent::after{
  left:16%!important;
  right:5%!important;
  width:auto!important;
  height:13.5%!important;
  box-sizing:border-box!important;
}
#h105fullcontent::before{top:2.5%!important}
#h105fullcontent::after{top:84%!important}

@media(max-width:390px){
  #h105fullcontent::before,#h105fullcontent::after{right:4%!important}
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h118.fetch(request,env,ctx);
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
