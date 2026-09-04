import h229 from './worker-h229.js';

const BUILD='H230';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h230-opponent-doubletap-fallback'))return out;

  const script=`<script id="h230-opponent-doubletap-fallback">window.addEventListener('DOMContentLoaded',()=>{
    /* H230 is deliberately a narrow Safari fallback for the dedicated Opponent
       battlefield only. H124 remains the primary gesture system. If H124 handles
       a double tap normally, the card's .tap class changes and this fallback does
       nothing. If the second tap reaches Safari but H124 fails to rotate it, call
       the existing H124 bridge once after the event has finished. */
    const DOUBLE_MS=320,HOLD_MS=360,CANCEL_DISTANCE=11;
    let press=null;
    const lastTap=new Map();

    const opponentCard=e=>{
      if(!document.body.classList.contains('h157-opp-mode'))return null;
      return e.target.closest?.('#oppcards .card[data-id]')||null;
    };

    window.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0)return;
      const card=opponentCard(e);if(!card)return;
      press={id:card.dataset.id,pid:e.pointerId,sx:e.clientX,sy:e.clientY,started:performance.now(),moved:false};
    },true);

    window.addEventListener('pointermove',e=>{
      if(!press||e.pointerId!==press.pid)return;
      if(Math.hypot(e.clientX-press.sx,e.clientY-press.sy)>CANCEL_DISTANCE)press.moved=true;
    },true);

    window.addEventListener('pointerup',e=>{
      const p=press;if(!p||e.pointerId!==p.pid)return;press=null;
      if(p.moved||performance.now()-p.started>=HOLD_MS)return;
      const card=opponentCard(e);if(!card||card.dataset.id!==p.id)return;
      const now=performance.now(),prev=lastTap.get(p.id)||0;
      if(!prev||now-prev>DOUBLE_MS){lastTap.set(p.id,now);return}
      lastTap.delete(p.id);

      const wasTapped=card.classList.contains('tap');
      const x=e.clientX,y=e.clientY,id=p.id;
      requestAnimationFrame(()=>{
        const current=[...document.querySelectorAll('#oppcards .card[data-id]')].find(el=>el.dataset.id===id);
        /* If H124 already handled the double tap, render() replaced/updated the
           card and the tap state is different. Only repair the missed case. */
        if(current&&current.classList.contains('tap')!==wasTapped)return;
        window.MTG_H124_cardGesture?.(id,'opp','rotate',x,y);
      });
    },true);

    window.addEventListener('pointercancel',e=>{if(press&&e.pointerId===press.pid)press=null},true);
    window.addEventListener('blur',()=>{press=null;lastTap.clear()});
  });</script>`;
  out=out.replace('</body>',script+'</body>');
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
