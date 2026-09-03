import h217 from './worker-h217.js';

const BUILD='H218';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h218-fullboard-no-opening-scroll-reset'))return out;

  /* H105 and H176 both contain legacy "open Full Board" behaviors that move the
     scroll viewport before H178 restores the user's saved position. Those two
     competing moves are the source of the visible top/opponent-board jitter.
     H178 already owns Full Board scroll memory, so stop only the legacy opening
     moves and leave all normal user scrolling / bounds logic untouched. */
  out=out.replace(
    "if(btn.dataset.v==='full')centerBoard();",
    "if(btn.dataset.v==='full')syncBar();/* h218-fullboard-no-opening-scroll-reset */"
  );
  out=out.replace(
    "requestAnimationFrame(()=>requestAnimationFrame(()=>{layout();viewport.scrollTop=0;clamp()}));",
    "requestAnimationFrame(()=>requestAnimationFrame(()=>{layout();clamp()}));/* h218-fullboard-no-opening-scroll-reset */"
  );

  /* Keep H197's brief hidden-settle safety net for this first pass. With H105
     and H176 no longer fighting the saved position, H178 can now restore the
     exact last Full Board scrollTop without an intermediate jump to the top. */
  const marker='\n<!-- h218-fullboard-no-opening-scroll-reset -->\n';
  out=out.replace('</body>',marker+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h217.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
