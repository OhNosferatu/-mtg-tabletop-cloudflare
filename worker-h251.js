import h247 from './worker-h247.js';

const BUILD='H251';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H251_FULLBOARD_PILE_PARITY'))return out;

  const helper=`
/* H251_FULLBOARD_PILE_PARITY
   H250 is intentionally not in this build. Restore the proven H247/H122/H117
   Full Board pile renderer/drag wiring, then make only two narrow parity fixes:
   1) battlefield -> pile uses the same 80% card-overlap test as the dedicated
      Your Side pile logic, using H244's exact visual drag-ghost center;
   2) opponent deckCount follows real known-card moves into/out of the deck.
   Full Board pile geometry/render ownership is otherwise untouched. */
function h251FullPileTarget(owner,c,cx,cy){
  if(!c||!Number.isFinite(cx)||!Number.isFinite(cy))return null;
  const size=fieldCardSize();
  let w=size.w,h=size.h;
  if(c.tap){const t=w;w=h;h=t}
  const a={left:cx-w/2,top:cy-h/2,right:cx+w/2,bottom:cy+h/2,width:w,height:h};
  let best=null,bestRatio=0;
  for(const zone of ['cmd','graveyard','deck','exile','tokens']){
    if(zone==='cmd'&&!c.meta?.commander)continue;
    const z=document.querySelector('#h116-piles-'+owner+' [data-h117-zone="'+zone+'"], #h116-piles-'+owner+' .h116-'+(zone==='cmd'?'cmd':zone));
    if(!z)continue;
    const ratio=overlapRatio(a,z.getBoundingClientRect());
    if(ratio>=.8&&ratio>bestRatio){best=zone;bestRatio=ratio}
  }
  return best;
}

/* Keep the opponent deck's visible count authoritative when a known top card is
   moved by the already-stable H117/H122 pile handlers. These wrappers do not
   change rendering, hit testing, or drag ownership. */
const h251BaseSetFieldPosition=h117SetFieldPosition;
h117SetFieldPosition=function(c,owner,x,y,faceDown=null){
  if(owner==='opp'&&c){
    const p=st.oppPublic||{};
    if(Array.isArray(p.deck)&&p.deck.includes(c.id))p.deckCount=Math.max(0,(Number(p.deckCount)||0)-1);
  }
  return h251BaseSetFieldPosition(c,owner,x,y,faceDown);
};
const h251BaseMoveToZone=h117MoveToZone;
h117MoveToZone=async function(id,owner,zone){
  if(owner==='opp'){
    const p=st.oppPublic||{};
    const inDeck=Array.isArray(p.deck)&&p.deck.includes(id),before=Number(p.deckCount)||0;
    if(inDeck&&zone!=='deck')p.deckCount=Math.max(0,before-1);
    else if(!inDeck&&zone==='deck')p.deckCount=before+1;
  }
  return h251BaseMoveToZone(id,owner,zone);
};
const h251BaseMoveToHiddenHand=h117MoveToHiddenHand;
h117MoveToHiddenHand=async function(id,owner,x=0){
  if(owner==='opp'){
    const p=st.oppPublic||{};
    if(Array.isArray(p.deck)&&p.deck.includes(id))p.deckCount=Math.max(0,(Number(p.deckCount)||0)-1);
  }
  return h251BaseMoveToHiddenHand(id,owner,x);
};
`;
  out=out.replace('function render(){',helper+'\nfunction render(){');

  /* H151 renamed the canonical public zone from discard -> graveyard upstream.
     Replace only H124's Full Board pointer-only pile test with the same physical
     80% card-overlap rule used by the dedicated player board. H247's exact free
     battlefield placement remains the fallback when no pile qualifies. */
  const oldLoop=`    for(const zone of ['cmd','graveyard','deck','exile','tokens']){
      if(zone==='cmd'&&!c.meta?.commander)continue;
      const z=document.querySelector('#h116-piles-'+owner+' [data-h117-zone="'+zone+'"], #h116-piles-'+owner+' .h116-'+(zone==='cmd'?'cmd':zone));
      if(z&&pointInRect(x,y,z.getBoundingClientRect())){await h117MoveToZone(id,owner,zone);return}
    }`;
  const newLoop=`    const h251Pile=h251FullPileTarget(owner,c,dropX,dropY);
    if(h251Pile){await h117MoveToZone(id,owner,h251Pile);return}`;
  out=out.replace(oldLoop,newLoop);
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h251-fullboard-pile-parity'))return out;

  /* Reassert the last confirmed Full Board pile geometry. These are exactly the
     H201 player slots and H203 opponent mirrored slots. H250 is excluded, so no
     custom pile renderer or late rewiring remains to collapse the columns. */
  const css=`<style id="h251-fullboard-pile-parity-style">
#h116-piles-you>[data-h117-zone="cmd"],#h116-piles-you>.h116-cmd{top:56.75%!important;bottom:auto!important}
#h116-piles-you>[data-h117-zone="exile"],#h116-piles-you>.h116-exile{top:65%!important;bottom:auto!important}
#h116-piles-you>[data-h117-zone="deck"],#h116-piles-you>.h116-deck{top:73.25%!important;bottom:auto!important}
#h116-piles-you>[data-h117-zone="graveyard"],#h116-piles-you>.h116-graveyard{top:81.5%!important;bottom:auto!important}
#h116-piles-you>[data-h117-zone="tokens"],#h116-piles-you>.h116-tokens{top:89.75%!important;bottom:auto!important}

#h116-piles-opp>[data-h117-zone="cmd"],#h116-piles-opp>.h116-cmd{top:auto!important;bottom:56.75%!important}
#h116-piles-opp>[data-h117-zone="exile"],#h116-piles-opp>.h116-exile{top:auto!important;bottom:65%!important}
#h116-piles-opp>[data-h117-zone="deck"],#h116-piles-opp>.h116-deck{top:auto!important;bottom:73.25%!important}
#h116-piles-opp>[data-h117-zone="graveyard"],#h116-piles-opp>.h116-graveyard{top:auto!important;bottom:81.5%!important}
#h116-piles-opp>[data-h117-zone="tokens"],#h116-piles-opp>.h116-tokens{top:auto!important;bottom:89.75%!important}
</style>`;
  out=out.replace('</head>',css+'</head>');
  out=out.replace('</body>','\n<!-- h251-fullboard-pile-parity -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    /* Deliberately branch from H247. H248-H250's Full Board pile experiments are
       removed from the active chain; H247's confirmed overlap/free-placement fix
       and the original stable H117/H122 pile interaction system remain intact. */
    const response=await h247.fetch(request,env,ctx);
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
