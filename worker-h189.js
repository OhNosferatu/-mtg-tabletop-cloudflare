import h188 from './worker-h188.js';

const BUILD='H189';
const BOARD_H=610;
const DIVIDER_H=58;
const TOTAL_H=(BOARD_H*2)+DIVIDER_H;
const LAND_H=BOARD_H*.27;
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h189-fixed-board-geometry'))return out;

  const css=`<style id="h189-fixed-board-geometry">
/* H189: lock the Full Board geometry to one canonical, non-responsive vertical
   coordinate system. Safari viewport changes may alter how much is visible at
   once, but they cannot resize either battlefield, the divider, or land zones. */
#h105fullcontent{
  --h176-board-h:${BOARD_H}px!important;
  --h133-divider-h:${DIVIDER_H}px!important;
  height:${TOTAL_H}px!important;
  min-height:${TOTAL_H}px!important;
  max-height:${TOTAL_H}px!important;
}
#h105fullcontent #fullcards,
#h116-piles-opp,#h116-piles-you{
  height:${BOARD_H*2}px!important;
  min-height:${BOARD_H*2}px!important;
  max-height:${BOARD_H*2}px!important;
}
#h105divider{
  height:${DIVIDER_H}px!important;
  min-height:${DIVIDER_H}px!important;
  max-height:${DIVIDER_H}px!important;
}
#h105fullcontent .h133-land-zone{
  height:${LAND_H}px!important;
  min-height:${LAND_H}px!important;
  max-height:${LAND_H}px!important;
}
#h105fullcontent .h133-land-opp{top:${BOARD_H*.05}px!important}
#h105fullcontent .h133-land-you{top:${BOARD_H+DIVIDER_H+(BOARD_H*.68)}px!important}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD,geometry:{playerSidePx:BOARD_H,dividerPx:DIVIDER_H,totalBoardPx:TOTAL_H,landZoneHeightPx:LAND_H}}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h188.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
