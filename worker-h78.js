import h71 from './worker-h71.js';

const BUILD='H78';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  // Recovery build: stay on the known-good H71/H70 interaction stack.
  // Tokens remain fully discovered by H71, but a stationary tap on the Tokens
  // pile is intentionally inert until the token browser is rebuilt safely.
  // Dragging from Tokens to Hand or battlefield continues through zoneDrag.
  return source.replace(
    "if(!moved){if(from==='deck'){openDeckOptions();return}openCard(c,true);return}",
    "if(!moved){if(from==='deck'){openDeckOptions();return}if(from==='tokens')return;openCard(c,true);return}"
  );
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h71.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      const out=text.replaceAll('H71','H78').replaceAll('h71-','h78-');
      return new Response(out,{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
