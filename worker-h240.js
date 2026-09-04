import h238 from './worker-h238.js';

const BUILD='H240';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h240-one-to-one-card-parity'))return out;

  const css=`<style id="h240-one-to-one-card-parity">
/* H240 restores the intended one-to-one battlefield model. Your Side and the
   dedicated Opponent screen already use the same normal .card dimensions. H116
   measures that normal battlefield card width and stores it on Full Board; use
   that exact measurement here instead of any overview/minified card sizing. */
#fullcards .card,
#fullcards .full-mini-card,
#fullcards .full-you-card,
#fullcards .full-opp-card,
#fullcards .h117-full-card{
  width:var(--h116-field-card-width)!important;
  height:auto!important;
  min-width:var(--h116-field-card-width)!important;
  max-width:var(--h116-field-card-width)!important;
  aspect-ratio:.716!important;
}

/* Do not crop the artwork corners on any battlefield. Scryfall's card image
   already contains the physical card edge, so the battlefield wrapper should
   not cut a second rounded mask into it. Keep a very small wrapper radius only
   for the shadow/background while letting the complete image remain visible. */
#field .card,
#oppcards .card,
#fullcards .card{
  border-radius:2px!important;
  overflow:visible!important;
}
#field .card>img,
#oppcards .card>img,
#fullcards .card>img{
  width:100%!important;
  height:100%!important;
  object-fit:contain!important;
  object-position:center!important;
  border-radius:0!important;
}

/* Reassert the table structure without changing its established coordinate
   planes: one complete opponent board, the 58px match divider, then one complete
   player board. No card or battlefield scale factor is introduced here. */
#h105fullcontent{
  height:calc((var(--h176-board-h,610px) * 2) + var(--h133-divider-h,58px))!important;
  min-height:calc((var(--h176-board-h,610px) * 2) + var(--h133-divider-h,58px))!important;
}
#h105fullcontent #fullcards,
#h116-piles-opp,
#h116-piles-you{
  height:calc(var(--h176-board-h,610px) * 2)!important;
  min-height:calc(var(--h176-board-h,610px) * 2)!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  out=out.replace('</body>','\n<!-- h240-one-to-one-card-parity -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    /* Build from H238 rather than H239: H239 assumed Full Board cards were meant
       to be smaller and scaled only their corner radius. H240 removes that
       assumption and treats all three battlefield views as one physical scale. */
    const response=await h238.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
