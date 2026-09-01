import h71 from './worker-h71.js';

const BUILD='H79';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function replaceBlock(source,startToken,endToken,replacement){
  const start=source.indexOf(startToken);
  const end=source.indexOf(endToken,start);
  if(start<0||end<0)return source;
  return source.slice(0,start)+replacement+source.slice(end);
}

function transformApp(source){
  let out=source;

  // Finish visible pile art before the import screen closes, then render once.
  // This removes the old load(...).then(render) race that could rebuild a pile
  // underneath an active iOS pointer immediately after import.
  out=replaceBlock(out,'function applyDeck(d){','async function importDeck(){',`async function applyDeck(d){
  st.cards=Object.fromEntries(Object.entries(st.cards).filter(([_,c])=>c.zone==='opp'));
  st.field=[];st.hand=[];st.scry=[];st.discard=[];st.exile=[];st.deckFlipped=false;
  st.cmd=expand(d.commander,'cmd');
  st.deck=expand(d.deck,'deck');
  st.deck.forEach(id=>st.cards[id].faceDown=true);
  st.side=expand(d.sideboard,'side');
  st.tokens=expand(d.tokens,'tokens');
  selectedHand=null;
  const preload=[...st.cmd.slice(0,2),st.tokens[0]].filter(Boolean);
  await Promise.all(preload.map(id=>load(st.cards[id])));
  render();
}
`);

  out=out.replace(
    "async function importDeck(){const r=await fetch('/api/import-archidekt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:$('#url').value.trim()})});let d;try{d=await r.json()}catch{throw Error('Importer returned an invalid response')}if(!r.ok)throw Error((d.error||'Import failed')+(d.detail?' · '+d.detail:''));applyDeck(d)}",
    "async function importDeck(){const r=await fetch('/api/import-archidekt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:$('#url').value.trim()})});let d;try{d=await r.json()}catch{throw Error('Importer returned an invalid response')}if(!r.ok)throw Error((d.error||'Import failed')+(d.detail?' · '+d.detail:''));await applyDeck(d)}"
  );
  out=out.replace(
    "$('#urlp').classList.contains('on')?await importDeck():applyDeck(parseList($('#list').value));",
    "$('#urlp').classList.contains('on')?await importDeck():await applyDeck(parseList($('#list').value));"
  );

  // Use the known-stable battlefield full-card viewer for every draggable pile
  // card except Deck. Explicitly release pointer capture before opening it.
  out=replaceBlock(out,'function zoneDrag(','function syncHandScroller',`function zoneDrag(el,id,from,{forceBack=false,label=''}={}){
  const c=st.cards[id];if(!c)return;
  let s=null,ghost=null,moved=false;
  el.onpointerdown=e=>{
    e.preventDefault();
    s={x:e.clientX,y:e.clientY,pid:e.pointerId};moved=false;
    try{el.setPointerCapture?.(e.pointerId)}catch{}
  };
  el.onpointermove=e=>{
    if(!s)return;
    if(!moved&&Math.hypot(e.clientX-s.x,e.clientY-s.y)>8){moved=true;ghost=makeGhost(c,forceBack)}
    if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px'}
  };
  el.onpointerup=async e=>{
    if(!s)return;
    const pid=s.pid,wasMoved=moved;s=null;moved=false;
    try{el.releasePointerCapture?.(pid)}catch{}
    ghost?.remove();ghost=null;
    if(!wasMoved){
      if(from==='deck'){openDeckOptions();return}
      requestAnimationFrame(()=>openBoardZoom(c));
      return;
    }
    if(handHit(e.clientX,e.clientY)){await moveToHandAt(id,e.clientX);return}
    const r=fieldRect();
    if(pointInRect(e.clientX,e.clientY,r)){
      placeOnField(id,e.clientX,e.clientY,forceBack);
      if(!forceBack&&!c.img)await load(c);
      render();
    }
  };
  el.onpointercancel=()=>{if(s){try{el.releasePointerCapture?.(s.pid)}catch{}}s=null;moved=false;ghost?.remove();ghost=null};
  el.oncontextmenu=e=>e.preventDefault();
}
`);

  // Force the full-screen Flip control to update the preview image immediately.
  out=out.replace(
    "if(a==='flip'){c.faceDown=!c.faceDown;syncFaceVisual(c);refreshBoardZoom();return}",
    "if(a==='flip'){c.faceDown=!c.faceDown;const zi=z.querySelector('img'),zs=displayImage(c)||'';if(zi){if(zs)zi.setAttribute('src',zs);else zi.removeAttribute('src')}syncFaceVisual(c);refreshBoardZoom();return}"
  );

  // Mulligan is a full table reset for the player's cards: ordinary cards from
  // Hand/Scry/field/Graveyard/Exile return to Deck, moved commanders return to
  // Commander, moved tokens return to Tokens, then seven fresh cards are drawn.
  out=replaceBlock(out,'async function mulligan(){','function untapAll(){',`async function mulligan(){
  const active=[...st.deck,...st.hand,...st.scry,...st.field,...st.discard,...st.exile];
  if(!active.length&&!st.cmd.length&&!st.tokens.length)return;
  const commanderIds=new Set(st.cmd),tokenIds=new Set(st.tokens),deckIds=[];
  for(const id of active){
    const c=st.cards[id];if(!c)continue;
    c.tap=false;c.p1=0;c.p=null;c.t=null;c.stateIndex=0;
    if(c.meta?.commander){c.zone='cmd';c.faceDown=false;commanderIds.add(id);continue}
    if(c.meta?.token){c.zone='tokens';c.faceDown=false;tokenIds.add(id);continue}
    c.zone='deck';c.faceDown=true;deckIds.push(id);
  }
  st.cmd=[...commanderIds];st.tokens=[...tokenIds];st.deck=[...new Set(deckIds)];
  st.hand=[];st.scry=[];st.field=[];st.discard=[];st.exile=[];st.deckFlipped=false;
  for(const id of st.cmd){const c=st.cards[id];if(c){c.zone='cmd';c.faceDown=false;c.tap=false;c.p1=0;c.p=null;c.t=null;c.stateIndex=0}}
  for(const id of st.tokens){const c=st.cards[id];if(c){c.zone='tokens';c.faceDown=false;c.tap=false;c.p1=0;c.p=null;c.t=null;c.stateIndex=0}}
  shuffle(st.deck);syncDeckFaces();
  for(let i=0;i<7&&st.deck.length;i++){
    const id=st.deck.shift(),c=st.cards[id];c.zone='hand';c.faceDown=false;c.tap=false;st.hand.push(id);
  }
  await Promise.all([...st.hand,...st.cmd.slice(0,2),st.tokens[0]].filter(Boolean).map(id=>load(st.cards[id])));
  selectedHand=null;
  const bz=$('#boardzoom');if(bz){bz.classList.remove('on');bz.querySelector('img')?.removeAttribute('src')}boardZoomCard=null;
  $('#inspect')?.classList.remove('on');$('#deckctrl')?.classList.remove('on');
  const hand=$('#hand');if(hand){hand.classList.remove('open');hand.classList.add('closed')}
  const closeButton=$('#closehand');if(closeButton){closeButton.textContent='Open';closeButton.setAttribute('aria-expanded','false')}
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

    const response=await h71.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      const out=text.replaceAll('H71','H79').replaceAll('h71-','h79-');
      return new Response(out,{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
