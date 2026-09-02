import h107 from './worker-h107.js';

const BUILD='H108';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replaceAll('H107','H108');
  if(out.includes('H108_FULL_BOARD_SCROLL_MEMORY'))return out;

  // H105 centered Full Board every time the tab was opened. Keep the user's
  // current Full Board vertical position instead, while preserving the old
  // centered starting position the first time Full Board is opened.
  out=out.replace(
    'let settingFromBar=false;',
    'let settingFromBar=false;let h108RememberedScroll=null;'
  );

  out=out.replace(
    "viewport.addEventListener('scroll',syncBar,{passive:true});",
    "viewport.addEventListener('scroll',()=>{h108RememberedScroll=viewport.scrollTop;syncBar()},{passive:true});"
  );

  out=out.replace(
    "if(btn.dataset.v==='full')centerBoard();",
    "if(btn.dataset.v==='full')requestAnimationFrame(()=>{if(h108RememberedScroll===null){centerBoard()}else{viewport.scrollTop=Math.max(0,Math.min(h108RememberedScroll,maxScroll()));syncBar()}});"
  );

  const marker='\n<!-- H108_FULL_BOARD_SCROLL_MEMORY -->\n';
  out=out.replace('</body>',marker+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h107.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
