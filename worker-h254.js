import h253 from './worker-h253.js';

const BUILD='H254';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  /* H253 exposed an older misspelling in one generated deck-render path. That
     ReferenceError aborts render(), which explains the failed import UI, missing
     piles, stale Mulligan/deck state, and post-drop freezes. Normalize the name
     before adding any new behavior. */
  let out=source.replaceAll('deckVisableFaceUp','deckVisibleFaceUp');
  if(out.includes('H254_RENDER_STABILITY_AND_OPP_PILE_SNAP'))return out;

  const helper=`
/* H254_RENDER_STABILITY_AND_OPP_PILE_SNAP */
function h254ClearEmptyDeckArtwork(){
  const clear=(el,count=0)=>{
    if(!el)return;
    el.querySelectorAll(':scope>img').forEach(img=>img.remove());
    const badge=el.querySelector(':scope>.count,.count');if(badge)badge.textContent=String(count);
    el.classList.add('empty');
  };
  if(!st.deck.length){
    clear($('#deck'),0);
    clear(document.querySelector('#h116-piles-you [data-h117-zone="deck"],#h116-piles-you .h116-deck'),0);
  }
  const p=st.oppPublic||{},oppCount=Math.max(Number(p.deckCount)||0,Array.isArray(p.deck)?p.deck.length:0);
  if(!oppCount){
    clear(document.querySelector('#h116-piles-opp [data-h117-zone="deck"],#h116-piles-opp .h116-deck'),0);
    clear(document.querySelector('#h157-opp-piles .h157-deck'),0);
  }
}

/* Dedicated Opponent pile drops use the same 60% physical-card overlap rule
   established for Your Side in H99 and restored to Full Board in H253. */
function h254OpponentPileTarget(id,cx,cy){
  const c=st.cards[id];if(!c||!Number.isFinite(cx)||!Number.isFinite(cy))return null;
  const src=document.querySelector('#oppcards .card[data-id="'+CSS.escape(id)+'"]');
  const sr=src?.getBoundingClientRect(),size=fieldCardSize();
  let w=sr?.width||size.w,h=sr?.height||size.h;
  if(c.tap&&(!sr||Math.abs(sr.width-sr.height)>2)){/* rendered rect already reflects rotation when available */}
  const a={left:cx-w/2,top:cy-h/2,right:cx+w/2,bottom:cy+h/2,width:w,height:h};
  let best=null,bestRatio=0;
  const specs=[
    ['cmd','#h157-opp-piles .h157-cmd'],
    ['graveyard','#h157-opp-piles .h157-graveyard'],
    ['deck','#h157-opp-piles .h157-deck'],
    ['exile','#h157-opp-piles .h157-exile'],
    ['tokens','#h157-opp-piles .h157-tokens']
  ];
  for(const [zone,sel] of specs){
    if(zone==='cmd'&&!c.meta?.commander)continue;
    const z=document.querySelector(sel);if(!z)continue;
    const ratio=overlapRatio(a,z.getBoundingClientRect());
    if(ratio>=.6&&ratio>bestRatio){best=zone;bestRatio=ratio}
  }
  return best;
}

const h254BaseGesture=window.MTG_H124_cardGesture;
window.MTG_H124_cardGesture=async function(id,owner,action,x=0,y=0,dropX=x,dropY=y,...rest){
  if(action==='drop'&&st.view==='opp'&&owner==='opp'){
    const pile=h254OpponentPileTarget(id,dropX,dropY);
    if(pile){await h117MoveToZone(id,'opp',pile);h254ClearEmptyDeckArtwork();return}
  }
  return h254BaseGesture?.(id,owner,action,x,y,dropX,dropY,...rest);
};

/* Run the empty-deck cleanup only after the canonical render has completed.
   Do not create/remove pile containers; this only prevents a zero-card deck from
   displaying a phantom card back. */
const h254BaseRender=render;
render=function(){h254BaseRender();h254ClearEmptyDeckArtwork()};
window.MTG_H254_clearEmptyDeckArtwork=h254ClearEmptyDeckArtwork;
`;

  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+helper+'\n/* H254_RENDER_STABILITY_AND_OPP_PILE_SNAP_END */\n'+out.slice(end);
  else out+=helper;
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h254-render-stability'))return out;
  const script=`<script id="h254-render-stability">window.addEventListener('DOMContentLoaded',()=>{
    const clean=()=>requestAnimationFrame(()=>window.MTG_H254_clearEmptyDeckArtwork?.());
    clean();setTimeout(clean,100);window.addEventListener('pageshow',clean);
  });</script>`;
  out=out.replace('</body>',script+'\n<!-- h254-render-stability -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h253.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
