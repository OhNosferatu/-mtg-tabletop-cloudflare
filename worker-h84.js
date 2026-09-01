import h83 from './worker-h83.js';

const BUILD='H84';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function replaceBlock(source,startToken,endToken,replacement){
  const start=source.indexOf(startToken);
  const end=source.indexOf(endToken,start);
  if(start<0||end<0)return source;
  return source.slice(0,start)+replacement+source.slice(end);
}

function transformApp(source){
  let out=source;

  out=replaceBlock(out,'async function mulligan(){','function untapAll(){',`function syncLoadedHandCard(c){
  if(!c||c.zone!=='hand')return;
  const el=document.querySelector('#handrow .hcard[data-id="'+c.id+'"]');
  if(!el)return;
  const src=displayImage(c)||'';
  let img=el.querySelector('img');
  const name=el.querySelector('.cardname');
  if(src){
    if(!img){img=document.createElement('img');img.draggable=false;el.insertBefore(img,el.firstChild)}
    if(img.getAttribute('src')!==src)img.setAttribute('src',src);
    if(name)name.remove();
  }
}
async function mulligan(){
  const ids=[...new Set([...st.deck,...st.hand,...st.scry,...st.field,...st.discard,...st.exile,...st.cmd,...st.tokens])];
  if(!ids.length)return;

  const commanders=[];
  const tokens=[];
  const library=[];

  for(const id of ids){
    const c=st.cards[id];if(!c)continue;
    c.tap=false;c.p1=0;c.p=null;c.t=null;c.stateIndex=0;
    if(c.meta?.commander){c.zone='cmd';c.faceDown=false;commanders.push(id);continue}
    if(c.meta?.token){c.zone='tokens';c.faceDown=false;tokens.push(id);continue}
    c.zone='deck';c.faceDown=true;library.push(id);
  }

  st.cmd=[...new Set(commanders)];
  st.tokens=[...new Set(tokens)];
  st.deck=[...new Set(library)];
  st.hand=[];st.scry=[];st.field=[];st.discard=[];st.exile=[];st.deckFlipped=false;
  shuffle(st.deck);
  syncDeckFaces();

  for(let i=0;i<7&&st.deck.length;i++){
    const id=st.deck.shift(),c=st.cards[id];
    c.zone='hand';c.faceDown=false;c.tap=false;
    st.hand.push(id);
  }

  preview=null;deckPreviewReveal=false;selectedHand=null;
  const bz=$('#boardzoom');if(bz){bz.classList.remove('on');bz.querySelector('img')?.removeAttribute('src')}
  boardZoomCard=null;
  $('#inspect')?.classList.remove('on');
  $('#deckctrl')?.classList.remove('on');
  const deckOverlay=$('#deckoverlay');if(deckOverlay)deckOverlay.classList.remove('on');

  const hand=$('#hand');
  if(hand){hand.classList.remove('closed');hand.classList.remove('open')}
  const closeButton=$('#closehand');
  if(closeButton){closeButton.textContent='Close';closeButton.setAttribute('aria-expanded','true')}

  render();
  const row=$('#handrow'),bar=$('#handscroll');
  if(row)row.scrollLeft=0;if(bar)bar.value=0;
  requestAnimationFrame(()=>requestAnimationFrame(syncHandScroller));

  // Load only the new Hand artwork in the background. Update each existing
  // Hand node in place so no whole-table render races with the next touch.
  for(const id of [...st.hand]){
    const c=st.cards[id];if(!c||frontImage(c))continue;
    load(c).then(()=>syncLoadedHandCard(c));
  }
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
      return new Response(text.replaceAll('H83','H84').replaceAll('h83-','h84-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
