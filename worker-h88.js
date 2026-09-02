import h83 from './worker-h83.js';

const BUILD='H88';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function replaceBlock(source,startToken,endToken,replacement){
  const start=source.indexOf(startToken);
  const end=source.indexOf(endToken,start);
  if(start<0||end<0)return source;
  return source.slice(0,start)+replacement+source.slice(end);
}

function transformApp(source){
  let out=source;

  out=replaceBlock(out,'async function applyDeck(d){','async function importDeck(){',`const LOCAL_PLAYER_ID='you';
let lastImportedDeckData=null;
function cloneDeckData(d){try{return JSON.parse(JSON.stringify(d||{}))}catch{return null}}
function ownIds(ids){for(const id of ids){const c=st.cards[id];if(c)c.ownerId=LOCAL_PLAYER_ID}return ids}
function cardArtKey(c){return String(c?.meta?.scryfallId||c?.name||'').toLowerCase()}
function captureOwnedArt(){
  const cache=new Map();
  Object.values(st.cards).forEach(c=>{
    if(c?.ownerId!==LOCAL_PLAYER_ID)return;
    const key=cardArtKey(c);if(!key||(!c.img&&!c.faces?.length))return;
    cache.set(key,{img:c.img||'',faces:Array.isArray(c.faces)?c.faces.map(f=>({...f})):[],isDoubleFaced:!!c.isDoubleFaced});
  });
  return cache;
}
function restoreOwnedArt(ids,cache){
  for(const id of ids){
    const c=st.cards[id],saved=c?cache.get(cardArtKey(c)):null;if(!c||!saved)continue;
    c.img=saved.img;c.faces=saved.faces.map(f=>({...f}));c.isDoubleFaced=saved.isDoubleFaced;
  }
}
function syncHardResetHandArt(c){
  if(!c||c.zone!=='hand')return;
  const el=document.querySelector('#handrow .hcard[data-id="'+c.id+'"]');if(!el)return;
  const src=displayImage(c)||'';if(!src)return;
  let img=el.querySelector('img');if(!img){img=document.createElement('img');img.draggable=false;el.insertBefore(img,el.firstChild)}
  img.setAttribute('src',src);el.querySelector('.cardname')?.remove();
}
async function applyDeck(d){
  lastImportedDeckData=cloneDeckData(d);
  st.cards=Object.fromEntries(Object.entries(st.cards).filter(([_,c])=>c.zone==='opp'));
  st.field=[];st.hand=[];st.scry=[];st.discard=[];st.exile=[];st.deckFlipped=false;
  st.cmd=ownIds(expand(d.commander,'cmd'));
  st.deck=ownIds(expand(d.deck,'deck'));
  st.deck.forEach(id=>st.cards[id].faceDown=true);
  st.side=ownIds(expand(d.sideboard,'side'));
  st.tokens=ownIds(expand(d.tokens,'tokens'));
  selectedHand=null;
  const preload=[...st.cmd.slice(0,2),...st.tokens].filter(Boolean);
  await Promise.all(preload.map(id=>load(st.cards[id])));
  render();
}
`);

  out=replaceBlock(out,'async function mulligan(){','function untapAll(){',`let mulliganBusy=false;
function mulligan(){
  if(mulliganBusy||!lastImportedDeckData)return;
  mulliganBusy=true;
  const data=cloneDeckData(lastImportedDeckData);
  const artCache=captureOwnedArt();

  setTimeout(()=>{
    try{
      // Hard-delete every card object owned by this player. Opponent cards are
      // deliberately left in st.cards and st.opp untouched.
      for(const [id,c] of Object.entries(st.cards))if(c?.ownerId===LOCAL_PLAYER_ID)delete st.cards[id];

      st.deck=[];st.hand=[];st.scry=[];st.cmd=[];st.side=[];st.tokens=[];st.discard=[];st.exile=[];st.field=[];st.deckFlipped=false;
      preview=null;deckPreviewReveal=false;selectedHand=null;boardZoomCard=null;

      // Recreate the exact previously imported deck as brand-new owned cards.
      st.cmd=ownIds(expand(data.commander,'cmd'));
      st.deck=ownIds(expand(data.deck,'deck'));
      st.side=ownIds(expand(data.sideboard,'side'));
      st.tokens=ownIds(expand(data.tokens,'tokens'));
      st.deck.forEach(id=>{const c=st.cards[id];if(c)c.faceDown=true});
      restoreOwnedArt([...st.cmd,...st.deck,...st.side,...st.tokens],artCache);

      shuffle(st.deck);syncDeckFaces();
      for(let i=0;i<7&&st.deck.length;i++){
        const id=st.deck.shift(),c=st.cards[id];
        c.zone='hand';c.faceDown=false;c.tap=false;st.hand.push(id);
      }

      const bz=$('#boardzoom');if(bz){bz.classList.remove('on');bz.querySelector('img')?.removeAttribute('src')}
      $('#inspect')?.classList.remove('on');$('#deckctrl')?.classList.remove('on');
      const deckOverlay=$('#deckoverlay');if(deckOverlay)deckOverlay.classList.remove('on');
      const hand=$('#hand');if(hand){hand.classList.remove('open');hand.classList.add('closed')}
      const closeButton=$('#closehand');if(closeButton){closeButton.textContent='Open';closeButton.setAttribute('aria-expanded','false')}

      render();

      // Missing Hand art loads into existing nodes only; no second board render.
      for(const id of [...st.hand]){
        const c=st.cards[id];if(!c||frontImage(c))continue;
        load(c).then(()=>syncHardResetHandArt(c));
      }
      mulliganBusy=false;
    }catch(err){
      console.error('H88 hard-reset Mulligan failed',err);
      mulliganBusy=false;
    }
  },60);
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
      return new Response(text.replaceAll('H83','H88').replaceAll('h83-','h88-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
