import h150 from './worker-h150.js';

const BUILD='H151';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function renameDiscard(source){
  return source
    .replace(/DISCARD/g,'GRAVEYARD')
    .replace(/Discard/g,'Graveyard')
    .replace(/discard/g,'graveyard');
}

function stamp(source){
  return renameDiscard(source)
    .replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
    .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h150.fetch(request,env,ctx);
    const html=url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test';
    const js=url.pathname.endsWith('.js');
    const css=url.pathname.endsWith('.css');

    if(html||js||css){
      const text=await response.text();
      const type=response.headers.get('content-type')||(html?'text/html; charset=utf-8':js?'application/javascript; charset=utf-8':'text/css; charset=utf-8');
      return new Response(stamp(text),{status:response.status,headers:headers(type)});
    }
    return response;
  }
};
