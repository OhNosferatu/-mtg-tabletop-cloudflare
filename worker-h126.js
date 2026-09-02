import h125 from './worker-h125.js';

const BUILD='H126';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function fixGestureBridge(source){
  /* H125 renamed the inline HTML gesture bridge from MTG_H124_cardGesture to
     MTG_H125_cardGesture, while app.js still correctly exposes the H124 API.
     That disconnected every completed gesture action: the drag ghost moved,
     but drop/view/rotate never reached game state. Restore the bridge only;
     leave the H125 counter rendering changes intact. */
  return source.replaceAll('MTG_H125_cardGesture','MTG_H124_cardGesture');
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h125.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(fixGestureBridge(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
