import h229 from './worker-h229.js';

const BUILD='H231';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h231-opponent-doubletap-window'))return out;

  /* The H124 recognizer does not compare tap timestamps directly; a double tap
     is recognized only while the first tap's pending viewer timer still exists.
     Dedicated Opponent taps need a slightly larger window on iPhone Safari.
     Keep the existing 285ms behavior everywhere else. */
  out=out.replace(
`    const finishTap=(g,x,y)=>{
      const key=keyFor(g.id,g.owner),old=tapTimers.get(key);
      if(old){
        clearTimeout(old);tapTimers.delete(key);
        api(g.id,g.owner,'rotate',x,y);
        return;
      }
      const timer=setTimeout(()=>{
        tapTimers.delete(key);
        api(g.id,g.owner,'view',x,y);
      },DOUBLE_MS);
      tapTimers.set(key,timer);
    };`,
`    const finishTap=(g,x,y)=>{
      const key=keyFor(g.id,g.owner),old=tapTimers.get(key);
      if(old){
        clearTimeout(old);tapTimers.delete(key);
        api(g.id,g.owner,'rotate',x,y);
        return;
      }
      /* h231-opponent-doubletap-window */
      const tapWindow=(g.owner==='opp'&&document.body.classList.contains('h157-opp-mode'))?460:DOUBLE_MS;
      const timer=setTimeout(()=>{
        tapTimers.delete(key);
        api(g.id,g.owner,'view',x,y);
      },tapWindow);
      tapTimers.set(key,timer);
    };`
  );

  /* H209's single-tap viewer fallback also has its own timer. Give the dedicated
     Opponent screen the same grace period so that fallback cannot open the viewer
     before H124 has a chance to receive the second tap. Other screens are unchanged. */
  out=out.replace(
`      },DOUBLE_MS+55);
      pending.set(key,timer);`,
`      },(ownerFor(cur.card)==='opp'&&document.body.classList.contains('h157-opp-mode'))?515:DOUBLE_MS+55);
      pending.set(key,timer);`
  );

  const marker='\n<!-- h231-opponent-doubletap-window -->\n';
  out=out.replace('</body>',marker+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h229.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
