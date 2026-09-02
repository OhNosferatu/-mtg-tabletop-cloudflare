import h95 from './worker-h95.js';

const BUILD='H96';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H96_PILE_SEARCH_PLACEMENT'))return source;
  let out=source;

  // Hide the H94 magnifying-glass buttons that were placed directly on the
  // Tokens, Graveyard and Exile piles. Deck search remains in the Deck menu.
  out=out.replace(
    '.h94-zone-search{position:absolute!important;',
    '.h94-zone-search{display:none!important;position:absolute!important;'
  );

  const helper=`function h96SyncPileSearch(z,c){
  if(!z)return;
  let b=z.querySelector('#h96pilesearch');
  if(!b){
    if(!document.querySelector('#h96pilesearchstyle')){
      const style=document.createElement('style');
      style.id='h96pilesearchstyle';
      style.textContent='#h96pilesearch{position:fixed;right:14px;bottom:max(210px,calc(env(safe-area-inset-bottom) + 200px));z-index:30004;width:50px;height:50px;border:2px solid #8b7659;border-radius:50%;background:#211b17f2;color:#f5ead8;font:900 23px/1 system-ui;display:grid;place-items:center;padding:0;box-shadow:0 5px 16px #0009;touch-action:manipulation}#h96pilesearch[hidden]{display:none!important}@media(max-width:390px){#h96pilesearch{right:10px;width:46px;height:46px;font-size:21px;bottom:max(202px,calc(env(safe-area-inset-bottom) + 192px))}}';
      document.head.appendChild(style);
    }
    b=document.createElement('button');
    b.type='button';b.id='h96pilesearch';b.textContent='⌕';b.hidden=true;
    b.addEventListener('pointerdown',e=>e.stopPropagation());
    b.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      const current=boardZoomCard,zone=current?.zone;
      if(!['tokens','discard','exile'].includes(zone))return;
      z.classList.remove('on');
      z.querySelector('img')?.removeAttribute('src');
      boardZoomCard=null;
      openZoneBrowserH94(zone);
    });
    z.appendChild(b);
  }
  const zone=c?.zone||'';
  const show=['tokens','discard','exile'].includes(zone);
  b.hidden=!show;
  if(show){
    const label=zone==='tokens'?'Tokens':zone==='discard'?'Graveyard':'Exile';
    b.setAttribute('aria-label','Search '+label);
    b.title='Search '+label;
  }
}/* H96_PILE_SEARCH_PLACEMENT */\n`;

  out=out.replace('async function openBoardZoom(c){',helper+'async function openBoardZoom(c){');
  out=out.replace(
    "boardZoomCard=c;img.removeAttribute('src');z.classList.add('on');refreshBoardZoom();",
    "boardZoomCard=c;img.removeAttribute('src');z.classList.add('on');h96SyncPileSearch(z,c);refreshBoardZoom();"
  );

  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h95.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H95','H96').replaceAll('h95-','h96-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
