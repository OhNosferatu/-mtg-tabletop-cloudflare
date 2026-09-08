import h251 from './worker-h251.js';

const BUILD='H252';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H252_FULLBOARD_LIVE_CANONICAL_STATE'))return out;

  const helper=`
/* H252_FULLBOARD_LIVE_CANONICAL_STATE
   Full Board is a view of the same canonical state as Your Side/Opponent.
   Rebuild its cards and piles from the live arrays after every render so no
   mirrored pile can keep a stale top-card id/count after a move or deck action. */
function h252SyncFullBoard(){
  const ff=$('#fullcards');
  if(ff){
    ff.innerHTML='';
    st.opp.forEach((id,i)=>{const c=st.cards[id];if(c)ff.appendChild(h117FullCardEl(c,'opp',i))});
    st.field.forEach((id,i)=>{const c=st.cards[id];if(c)ff.appendChild(h117FullCardEl(c,'you',i))});
  }
  const oppLayer=$('#h116-piles-opp'),youLayer=$('#h116-piles-you');
  oppLayer?.classList.remove('h120-fallback');
  youLayer?.classList.remove('h120-fallback');
  h117RenderFullPiles();
  h117RenderHandCounts();
  h117SyncCardWidth();
}
window.MTG_H252_syncFullBoard=h252SyncFullBoard;

/* Use the final render function produced by the whole existing chain, then do
   one authoritative Full Board sync at the very end. This catches deck actions,
   viewer zone buttons, hand moves, pile moves, and field moves uniformly. */
const h252BaseRender=render;
render=function(){h252BaseRender();h252SyncFullBoard()};

function h252FullPileTarget(owner,c,cx,cy){
  if(!c||!Number.isFinite(cx)||!Number.isFinite(cy))return null;
  const src=document.querySelector('#fullcards .h117-full-card[data-id="'+CSS.escape(c.id)+'"]');
  const sr=src?.getBoundingClientRect();
  let w=sr?.width||fieldCardSize().w,h=sr?.height||fieldCardSize().h;
  const a={left:cx-w/2,top:cy-h/2,right:cx+w/2,bottom:cy+h/2,width:w,height:h};
  let best=null,bestRatio=0;
  for(const zone of ['cmd','graveyard','deck','exile','tokens']){
    if(zone==='cmd'&&!c.meta?.commander)continue;
    const z=document.querySelector('#h116-piles-'+owner+' [data-h117-zone="'+zone+'"],#h116-piles-'+owner+' .h116-'+(zone==='cmd'?'cmd':zone));
    if(!z)continue;
    const ratio=overlapRatio(a,z.getBoundingClientRect());
    if(ratio>=.8&&ratio>bestRatio){best=zone;bestRatio=ratio}
  }
  return best;
}

/* H124 remains the one battlefield gesture recognizer. Wrap only its Full Board
   DROP action so pile snapping cannot depend on an older pointer-only branch.
   Everything else delegates unchanged to the proven H247/H244 gesture path. */
const h252BaseGesture=window.MTG_H124_cardGesture;
window.MTG_H124_cardGesture=async function(id,owner,action,x=0,y=0,dropX=x,dropY=y,...rest){
  if(action==='drop'&&st.view==='full'){
    const c=st.cards[id];
    if(c){
      if(owner==='you'&&(handHit(x,y)||h117HandBadgeHit('you',x,y))){await h117MoveToHiddenHand(id,'you',x);h252SyncFullBoard();return}
      if(owner==='opp'&&h117HandBadgeHit('opp',x,y)){await h117MoveToHiddenHand(id,'opp',x);h252SyncFullBoard();return}
      const pile=h252FullPileTarget(owner,c,dropX,dropY);
      if(pile){await h117MoveToZone(id,owner,pile);h252SyncFullBoard();return}
    }
  }
  return h252BaseGesture?.(id,owner,action,x,y,dropX,dropY,...rest);
};
`;

  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+helper+'\n/* H252_FULLBOARD_LIVE_CANONICAL_STATE_END */\n'+out.slice(end);
  else out+=helper;
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h252-fullboard-live-canonical-state'))return out;
  const script=`<script id="h252-fullboard-live-canonical-state">window.addEventListener('DOMContentLoaded',()=>{
    const sync=()=>requestAnimationFrame(()=>window.MTG_H252_syncFullBoard?.());
    document.querySelector('[data-v="full"]')?.addEventListener('click',sync);
    /* Some deck/viewer actions update state asynchronously or stop propagation.
       Schedule a post-action mirror refresh without changing those actions. */
    document.addEventListener('click',e=>{
      if(!e.target.closest?.('#deckctrl button,[data-da],#boardzoomcontrols [data-zact],#h117-opp-deck [data-h117-oppdeck]'))return;
      setTimeout(sync,0);setTimeout(sync,80);
    },true);
    window.addEventListener('pageshow',sync);sync();setTimeout(sync,120);
  });</script>`;
  out=out.replace('</body>',script+'\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h251.fetch(request,env,ctx);
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
