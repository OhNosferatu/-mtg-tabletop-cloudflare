import h46 from './worker-h46.js';

const BUILD='H47';

function headers(contentType){
  return{
    'content-type':contentType,
    'cache-control':'no-store, max-age=0, must-revalidate',
    'pragma':'no-cache',
    'expires':'0',
    'x-mtg-build':BUILD
  };
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health'){
      return new Response(JSON.stringify({ok:true,build:BUILD}),{
        status:200,
        headers:headers('application/json; charset=utf-8')
      });
    }

    const response=await h46.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      let out=text.replaceAll('H46','H47').replaceAll('h46-','h47-');
      const sharedFullscreenStyle='<style id="h47-fullscreen-backdrop">.inspect.on,.modal.on,#boardzoom.on{background:rgba(5,5,5,.62)!important}</style>';
      out=out.replace('</head>',sharedFullscreenStyle+'</head>');
      return new Response(out,{
        status:response.status,
        headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')
      });
    }
    return response;
  }
};
