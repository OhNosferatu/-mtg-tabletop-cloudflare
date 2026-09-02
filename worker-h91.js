import h90 from './worker-h90.js';

const BUILD='H91';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H91_BOARD_TAP_BEHAVIOR'))return source;
  let out=source;

  const oldDouble="clearTimeout(lastTap[c.id+'_timer']);delete lastTap[c.id+'_timer'];lastTap[c.id]=0;openBoardZoom(c)";
  const newDouble="clearTimeout(lastTap[c.id+'_timer']);delete lastTap[c.id+'_timer'];lastTap[c.id]=0;c.tap=!c.tap;syncTapVisual(c)/* H91_BOARD_TAP_BEHAVIOR */";
  out=out.replace(oldDouble,newDouble);

  const oldSingle="lastTap[c.id+'_timer']=setTimeout(()=>{if(lastTap[c.id]===now){c.tap=!c.tap;lastTap[c.id]=0;delete lastTap[c.id+'_timer'];syncTapVisual(c)}},330)";
  const newSingle="lastTap[c.id+'_timer']=setTimeout(()=>{if(lastTap[c.id]===now){lastTap[c.id]=0;delete lastTap[c.id+'_timer'];requestAnimationFrame(()=>openBoardZoom(c))}},300)";
  out=out.replace(oldSingle,newSingle);

  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h90.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H90','H91').replaceAll('h90-','h91-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
