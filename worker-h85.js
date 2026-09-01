import h83 from './worker-h83.js';

const BUILD='H85';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function replaceBlock(source,startToken,endToken,replacement){
  const start=source.indexOf(startToken);
  const end=source.indexOf(endToken,start);
  if(start<0||end<0)return source;
  return source.slice(0,start)+replacement+source.slice(end);
}

function transformApp(source){
  let out=source;

  // Capture immutable zone membership when a deck is imported. Mulligan can
  // then restore these exact card ids instead of walking/classifying live zones.
  out=replaceBlock(out,'async function applyDeck(d){','async function importDeck(){',`let mulliganLibraryIds=[],mulliganCommanderIds=[],mulliganTokenIds=[];
async function applyDeck(d){
  st.cards=Object.fromEntries(Object.entries(st.cards).filter(([_,c])=>c.zone==='opp'));
  st.field=[];st.hand=[];st.scry=[];st.discard=[];st.exile=[];st.deckFlipped=false;
  st.cmd=expand(d.commander,'cmd');
  st.deck=expand(d.deck,'deck');
  st.deck.forEach(id=>st.cards[id].faceDown=true);
  st.side=expand(d.sideboard,'side');
  st.tokens=expand(d.tokens,'tokens');
  mulliganLibraryIds=[...st.deck];
  mulliganCommanderIds=[...st.cmd];
  mulliganTokenIds=[...st.tokens];
  selectedHand=null;
  const preload=[...st.cmd.slice(0,2),...st.tokens].filter(Boolean);
  await Promise.all(preload.map(id=>load(st.cards[id])));
  render();
}
`);

  // Snapshot-based Mulligan: restore exact imported membership, shuffle the
  // original library, deal seven immediately, then render once. No network
  // requests and no live-zone scanning occur in the button press path.
  out=replaceBlock(out,'async function mulligan(){','function untapAll(){',`function mulligan(){
  if(!mulliganLibraryIds.length)return;

  st.hand=[];st.scry=[];st.field=[];st.discard=[];st.exile=[];st.deckFlipped=false;
  st.deck=[...mulliganLibraryIds];
  st.cmd=[...mulliganCommanderIds];
  st.tokens=[...mulliganTokenIds];

  for(const id of st.deck){
    const c=st.cards[id];if(!c)continue;
    c.zone='deck';c.faceDown=true;c.tap=false;c.p1=0;c.p=null;c.t=null;c.stateIndex=0;c.x=40;c.y=40;
  }
  for(const id of st.cmd){
    const c=st.cards[id];if(!c)continue;
    c.zone='cmd';c.faceDown=false;c.tap=false;c.p1=0;c.p=null;c.t=null;c.stateIndex=0;c.x=40;c.y=40;
  }
  for(const id of st.tokens){
    const c=st.cards[id];if(!c)continue;
    c.zone='tokens';c.faceDown=false;c.tap=false;c.p1=0;c.p=null;c.t=null;c.stateIndex=0;c.x=40;c.y=40;
  }

  shuffle(st.deck);syncDeckFaces();
  for(let i=0;i<7&&st.deck.length;i++){
    const id=st.deck.shift(),c=st.cards[id];
    c.zone='hand';c.faceDown=false;c.tap=false;st.hand.push(id);
  }

  preview=null;deckPreviewReveal=false;selectedHand=null;boardZoomCard=null;
  const bz=$('#boardzoom');if(bz){bz.classList.remove('on');bz.querySelector('img')?.removeAttribute('src')}
  $('#inspect')?.classList.remove('on');$('#deckctrl')?.classList.remove('on');
  const deckOverlay=$('#deckoverlay');if(deckOverlay)deckOverlay.classList.remove('on');

  const hand=$('#hand');if(hand){hand.classList.remove('closed');hand.classList.remove('open')}
  const closeButton=$('#closehand');if(closeButton){closeButton.textContent='Close';closeButton.setAttribute('aria-expanded','true')}

  render();
  const row=$('#handrow'),bar=$('#handscroll');if(row)row.scrollLeft=0;if(bar)bar.value=0;
  requestAnimationFrame(()=>requestAnimationFrame(syncHandScroller));
}
`);

  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h83.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H83','H85').replaceAll('h83-','h85-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
