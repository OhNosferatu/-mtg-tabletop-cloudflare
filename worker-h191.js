import h190 from './worker-h190.js';

const BUILD='H191';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h191-durable-pile-slots'))return out;

  const css=`<style id="h191-durable-pile-slots">
/* H191: pile positions must survive H116's cloneYourPiles() refresh. Mulligan
   mutates the source Deck zone, which causes H116 to replace the Full Board
   player pile children. Inline top values are therefore not durable. These
   canonical CSS slots apply immediately to both existing and newly-cloned piles. */
#h116-piles-opp,#h116-piles-you{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:calc((var(--h190-board-h) * 2) + var(--h190-divider-h))!important;
  min-height:calc((var(--h190-board-h) * 2) + var(--h190-divider-h))!important;
  max-height:calc((var(--h190-board-h) * 2) + var(--h190-divider-h))!important;
  translate:none!important;
  transform:none!important;
}
#h116-piles-opp>.h116-pile,#h116-piles-you>.h116-pile{
  left:1.4%!important;
  right:auto!important;
  margin:0!important;
  translate:none!important;
  transform:none!important;
}
/* Approved H186 opponent slots. */
#h116-piles-opp>.h116-tokens{top:calc(var(--h190-board-h) * .135)!important}
#h116-piles-opp>.h116-discard{top:calc(var(--h190-board-h) * .30)!important}
#h116-piles-opp>.h116-deck{top:calc(var(--h190-board-h) * .465)!important}
#h116-piles-opp>.h116-exile{top:calc(var(--h190-board-h) * .63)!important}
#h116-piles-opp>.h116-cmd{top:calc(var(--h190-board-h) * .795)!important}
/* Approved H186 player slots, offset past the divider. */
#h116-piles-you>.h116-cmd{top:calc(var(--h190-board-h) + var(--h190-divider-h) + (var(--h190-board-h) * .135))!important}
#h116-piles-you>.h116-exile{top:calc(var(--h190-board-h) + var(--h190-divider-h) + (var(--h190-board-h) * .30))!important}
#h116-piles-you>.h116-deck{top:calc(var(--h190-board-h) + var(--h190-divider-h) + (var(--h190-board-h) * .465))!important}
#h116-piles-you>.h116-discard{top:calc(var(--h190-board-h) + var(--h190-divider-h) + (var(--h190-board-h) * .63))!important}
#h116-piles-you>.h116-tokens{top:calc(var(--h190-board-h) + var(--h190-divider-h) + (var(--h190-board-h) * .795))!important}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h190.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
