import h64 from './worker-h64.js';

const BUILD='H69';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  let out=source;

  out=out.replace(
    'let deckActionBusy=false;',
    'let deckActionBusy=false,deckExitOpenHand=false,deckExitShowScry=false;'
  );

  out=out.replace(
    "  if(status)status.textContent=st.deck.length+' cards · '+state;",
    "  if(status)status.textContent=st.deck.length+' cards · '+state;\n  const top=deckVisibleCard();\n  const revealBtn=z.querySelector('button[data-deck-action=\"reveal\"]');\n  if(revealBtn)revealBtn.textContent=top&&!top.faceDown?'Unreveal Card':'Reveal Top';"
  );

  out=out.replace(
`function closeDeckOverlay(){
  preview=null;deckPreviewReveal=false;deckActionBusy=false;deckOpenPending=false;
  clearTimeout(deckTapTimer);deckTapTimer=null;deckTapAt=0;
  const z=$('#deckoverlay');
  if(z){z.classList.remove('on');z.querySelectorAll('button[data-deck-action]').forEach(x=>x.disabled=false)}
}`,
`function closeDeckOverlay(){
  preview=null;deckPreviewReveal=false;deckActionBusy=false;deckOpenPending=false;
  clearTimeout(deckTapTimer);deckTapTimer=null;deckTapAt=0;
  const z=$('#deckoverlay');
  if(z){z.classList.remove('on');z.querySelectorAll('button[data-deck-action]').forEach(x=>x.disabled=false)}
  const openHand=deckExitOpenHand&&st.hand.length>0;
  const showScry=deckExitShowScry&&st.scry.length>0;
  deckExitOpenHand=false;deckExitShowScry=false;
  if(openHand){
    const hand=$('#hand'),button=$('#closehand'),row=$('#handrow'),bar=$('#handscroll');
    hand?.classList.remove('closed');
    if(button){button.textContent='Close';button.setAttribute('aria-expanded','true')}
    if(row)row.scrollLeft=0;
    if(bar)bar.value=0;
    requestAnimationFrame(()=>requestAnimationFrame(syncHandScroller));
  }
  if(showScry)requestAnimationFrame(()=>renderScryHand());
}`
  );

  out=out.replace(
`  if(action==='draw'){
    const id=st.deck.shift(),c=st.cards[id];
    c.zone='hand';c.faceDown=false;c.tap=false;st.hand.unshift(id);
    closeDeckOverlay();render();
    load(c).then(()=>{if(c.zone==='hand')render()});
    return;
  }`,
`  if(action==='draw'){
    const id=st.deck.shift(),c=st.cards[id];
    c.zone='hand';c.faceDown=false;c.tap=false;st.hand.unshift(id);
    deckExitOpenHand=true;preview=deckVisibleCard();
    render();syncDeckPileVisual();renderDeckOverlay();
    load(c).then(()=>{if(c.zone==='hand'){render();renderDeckOverlay()}});
    return;
  }`
  );

  out=out.replace(
`  if(action==='reveal'){
    const c=deckVisibleCard();
    if(!c)return;
    c.faceDown=false;deckPreviewReveal=false;preview=c;
    render();syncDeckPileVisual();renderDeckOverlay();
    if(!frontImage(c)){await load(c);if(c===deckVisibleCard()){render();syncDeckPileVisual();renderDeckOverlay()}}
    return;
  }`,
`  if(action==='reveal'){
    const c=deckVisibleCard();
    if(!c)return;
    c.faceDown=!c.faceDown;deckPreviewReveal=false;preview=c;
    render();syncDeckPileVisual();renderDeckOverlay();
    if(!c.faceDown&&!frontImage(c)){await load(c);if(c===deckVisibleCard()){render();syncDeckPileVisual();renderDeckOverlay()}}
    return;
  }`
  );

  out=out.replace(
`  if(action==='flipdeck'){
    st.deck.reverse();
    st.deckFlipped=!st.deckFlipped;
    st.deck.forEach(id=>{const c=st.cards[id];if(c)c.faceDown=!st.deckFlipped});`,
`  if(action==='flipdeck'){
    st.deck.reverse();
    st.deckFlipped=!st.deckFlipped;
    st.deck.forEach(id=>{const c=st.cards[id];if(c)c.faceDown=!c.faceDown});`
  );

  out=out.replace(
`async function scryOne(){
  if(!st.deck.length){closeDeckOverlay();render();return}
  const id=st.deck.shift(),c=st.cards[id];
  c.zone='scry';c.faceDown=false;c.tap=false;st.scry.push(id);
  closeDeckOverlay();render();renderScryHand();
  load(c).then(()=>{if(c.zone==='scry')renderScryHand()});
}`,
`async function scryOne(){
  if(!st.deck.length){renderDeckOverlay();return}
  const id=st.deck.shift(),c=st.cards[id];
  c.zone='scry';c.faceDown=false;c.tap=false;st.scry.push(id);
  deckExitShowScry=true;preview=deckVisibleCard();
  render();syncDeckPileVisual();renderDeckOverlay();
  load(c).then(()=>{if(c.zone==='scry'){renderScryHand();renderDeckOverlay()}});
}`
  );

  out=out.replace(
`  const z=ensureDeckOverlay();
  preview=deckVisibleCard();deckPreviewReveal=false;deckOpenPending=false;
  z.classList.add('on');`,
`  const z=ensureDeckOverlay();
  deckExitOpenHand=false;deckExitShowScry=false;
  preview=deckVisibleCard();deckPreviewReveal=false;deckOpenPending=false;
  z.classList.add('on');`
  );

  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h64.fetch(request,env,ctx);

    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }

    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      const out=text.replaceAll('H64','H69').replaceAll('h64-','h69-');
      return new Response(out,{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }

    return response;
  }
};
