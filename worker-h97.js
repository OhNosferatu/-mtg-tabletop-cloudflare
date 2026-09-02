import h96 from './worker-h96.js';

const BUILD='H97';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function replaceBlock(source,startToken,endToken,replacement){
  const start=source.indexOf(startToken);
  const end=source.indexOf(endToken,start);
  if(start<0||end<0)return source;
  return source.slice(0,start)+replacement+source.slice(end);
}

function transformApp(source){
  if(source.includes('H97_SEARCH_CLEANUP'))return source;
  let out=source;

  // Board piles should never display their own search icon. Keep the H94
  // observers harmless by turning their installer into a cleanup-only no-op.
  out=replaceBlock(out,'function installPileSearchButtonH94(el,zone){','function installDeckSearchButtonH94(){',`function installPileSearchButtonH94(el,zone){
  if(!el)return;
  el.classList.remove('h94-searchable-pile');
  el.querySelectorAll('.h94-zone-search').forEach(b=>b.remove());
}

`);

  // Match the full-screen pile Search button to the compact Deck Search button.
  out=out.replace('width:50px;height:50px;border:2px solid #8b7659','width:30px;height:30px;border:1px solid #8b7659');
  out=out.replace('font:900 23px/1 system-ui','font:900 14px/1 system-ui');
  out=out.replace('width:46px;height:46px;font-size:21px','width:30px;height:30px;font-size:14px');

  const marker='\n/* H97_SEARCH_CLEANUP */\n';
  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+marker+out.slice(end);
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h96.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H96','H97').replaceAll('h96-','h97-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
