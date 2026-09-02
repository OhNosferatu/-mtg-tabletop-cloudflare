import h83 from './worker-h83.js';

const BUILD='H87';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function replaceBlock(source,startToken,endToken,replacement){
  const start=source.indexOf(startToken);
  const end=source.indexOf(endToken,start);
  if(start<0||end<0)return source;
  return source.slice(0,start)+replacement+source.slice(end);
}

function transformApp(source){
  let out=source;

  out=replaceBlock(out,'async function applyDeck(d){','async function importDeck(){',`let mulliganDeckData=null;
function cloneDeckData(d){try{return JSON.parse(JSON.stringify(d||{}))}catch{return null}}
function cardArtKey(c){return String(c?.meta?.scryfallId||c?.name||'').toLowerCase()}
function captureArtCache(){
  const cache=new Map();
  Object.values(st.cards).forEach(c=>{
    const key=cardArtKey(c);if(!key||(!c.img&&!c.faces?.length))return;
    cache.set(key,{img:c.img||'',faces:Array.isArray(c.faces)?c.faces.map(f=>({...f})):[],isDoubleFaced:!!c.isDoubleFaced});
  });
  return cache;
}
function restoreCachedArt(ids,cache){
  for(const id of ids){
    const c=st.cards[id],saved=cache.get(cardArtKey(c));if(!c||!saved)continue;
    c.img=saved.img;c.faces=saved.faces.map(f=>({...f}));c.isDoubleFaced=saved.isDoubleFaced;
  }
}
function syncMulliganHandArt(c){
  if(!c||c.zone!=='hand')return;
  const el=document.querySelector('#handrow .hcard[data-id="'+c.id+'"]');if(!el)return;
  const src=displayImage(c)||'';if(!src)return;
  let img=el.querySelector('img');if(!img){img=document.createElement('img');img.draggable=false;el.insertBefore(img,el.firstChild)}
  img.setAttribute('src',src);el.querySelector('.cardname')?.remove();
}
async function applyDeck(d){
  mulliganDeckData=cloneDeckData(d);
  st.cards=Object.fromEntries(Object.entries(st.cards).filter(([_,c])=>c.zone==='opp'));
  st.field=[];st.hand=[];st.scry=[];st.discard=[];st.exile=[];st.deckFlipped=false;
  st.cmd=expand(d.commander,'cmd');
  st.deck=expand(d.deck,'deck');
  st.deck.forEach(id=>st.cards[id].faceDown=true);
  st.side=expand(d.sideboard,'side');
  st.tokens=expand(d.tokens,'tokens');
  selectedHand=null;
  const preload=[...st.cmd.slice(0,2),...st.tokens].filter(Boolean);
  await Promise.all(preload.map(id=>load(st.cards[id])));
  render();
}
`);

  out=replaceBlock(out,'async function mulligan(){','function untapAll(){',`let mulliganBusy=false;
function mulligan(){
  if(mulliganBusy||!mulliganDeckData)return;
  mulliganBusy=true;
  const button=$('#mulligan');
  if(button){button.disabled=true;button.textContent='Resetting…'}

  setTimeout(()=>{
    try{
      const d=cloneDeckData(mulliganDeckData);
      if(!d)throw new Error('No imported deck snapshot');
      const artCache=captureArtCache();
      if(button)button.textContent='Rebuilding…';

      const oppEntries=Object.entries(st.cards).filter(([_,c])=>c.zone==='opp');
      st.cards=Object.fromEntries(oppEntries);
      st.field=[];st.hand=[];st.scry=[];st.discard=[];st.exile=[];st.deckFlipped=false;
      st.cmd=expand(d.commander,'cmd');
      st.deck=expand(d.deck,'deck');
      st.side=expand(d.sideboard,'side');
      st.tokens=expand(d.tokens,'tokens');
      st.deck.forEach(id=>{const c=st.cards[id];if(c)c.faceDown=true});
      restoreCachedArt([...st.cmd,...st.deck,...st.side,...st.tokens],artCache);

      if(button)button.textContent='Shuffling…';
      shuffle(st.deck);syncDeckFaces();
      for(let i=0;i<7&&st.deck.length;i++){
        const id=st.deck.shift(),c=st.cards[id];
        c.zone='hand';c.faceDown=false;c.tap=false;st.hand.push(id);
      }

      preview=null;deckPreviewReveal=false;selectedHand=null;boardZoomCard=null;
      const bz=$('#boardzoom');if(bz){bz.classList.remove('on');bz.querySelector('img')?.removeAttribute('src')}
      $('#inspect')?.classList.remove('on');$('#deckctrl')?.classList.remove('on');
      const deckOverlay=$('#deckoverlay');if(deckOverlay)deckOverlay.classList.remove('on');
      const hand=$('#hand');if(hand){hand.classList.remove('open');hand.classList.add('closed')}
      const closeButton=$('#closehand');if(closeButton){closeButton.textContent='Open';closeButton.setAttribute('aria-expanded','false')}

      if(button)button.textContent='Rendering…';
      requestAnimationFrame(()=>{
        render();
        for(const id of [...st.hand]){
          const c=st.cards[id];if(!c||frontImage(c))continue;
          load(c).then(()=>syncMulliganHandArt(c));
        }
        requestAnimationFrame(()=>{
          mulliganBusy=false;
          if(button){button.disabled=false;button.textContent='Mulligan'}
        });
      });
    }catch(err){
      console.error('Fresh-state Mulligan failed',err);
      mulliganBusy=false;
      if(button){button.disabled=false;button.textContent='Mulligan'}
    }
  },80);
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
      return new Response(text.replaceAll('H83','H87').replaceAll('h83-','h87-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
