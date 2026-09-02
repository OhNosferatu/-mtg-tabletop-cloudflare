import h97 from './worker-h97.js';

const BUILD='H98';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H98_SEARCH_VIEWER_TWEAKS'))return source;
  let out=source;

  // Move the compact full-card Search button closer to the action panel.
  // Keep its H97 30x30 size unchanged.
  out=out.replace(
    'bottom:max(210px,calc(env(safe-area-inset-bottom) + 200px))',
    'bottom:max(165px,calc(env(safe-area-inset-bottom) + 155px))'
  );
  out=out.replace(
    'bottom:max(202px,calc(env(safe-area-inset-bottom) + 192px))',
    'bottom:max(160px,calc(env(safe-area-inset-bottom) + 150px))'
  );

  // Search-result full-screen viewer: To Board replaces To Hand. Normal
  // battlefield/full-card viewers keep their existing To Hand action.
  out=out.replace(
    '<button data-h94move="hand">To Hand</button>',
    '<button data-h94move="field">To Board</button>'
  );
  out=out.replace(
    "if(!c||!['hand','discard','exile'].includes(zone))return;",
    "if(!c||!['field','discard','exile'].includes(zone))return;"
  );

  const marker='\n/* H98_SEARCH_VIEWER_TWEAKS */\n';
  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+marker+out.slice(end);
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h97.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H97','H98').replaceAll('h97-','h98-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
