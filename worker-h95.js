import h94 from './worker-h94.js';

const BUILD='H95';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H95_SEARCH_FIXES'))return source;
  let out=source;

  // H94 accidentally changed searchable board zones from their normal absolute
  // positioning to relative positioning. Keep the search button overlay, but
  // leave the zone itself exactly where the game board CSS places it.
  out=out.replace('.h94-searchable-pile{position:relative!important}','.h94-searchable-pile{}');

  // The isolated Deck menu is built around #deckoverlaypanel (H53+), not the
  // nonexistent #deckoverlaybottom. Point the existing H94 installer at the
  // real panel so its observer can install once and then disconnect.
  out=out.replace("const bottom=$('#deckoverlaybottom');if(!bottom)return false;","const bottom=$('#deckoverlaypanel');if(!bottom)return false;");

  // On iOS, preventing the pointerdown default can suppress the click that
  // should open Search. Stop bubbling into the draggable pile, but allow the
  // button's normal click to be generated.
  out=out.replaceAll(
    "b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation()});",
    "b.addEventListener('pointerdown',e=>{e.stopPropagation()});"
  );

  // Make the Deck search icon clearly sit in the status/header area without
  // changing the 3-column deck action grid below it.
  out=out.replace(
    '#h94decksearch{position:absolute;right:5px;top:4px;',
    '#h94decksearch{position:absolute;right:10px;top:10px;'
  );
  out=out.replace(
    '#deckoverlaystatus{position:relative;padding-right:40px!important}',
    '#deckoverlaypanel{position:absolute!important}#deckoverlaystatus{padding-right:40px!important}'
  );

  const marker=`\n/* H95_SEARCH_FIXES */\n`;
  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+marker+out.slice(end);
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h94.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H94','H95').replaceAll('h94-','h95-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
