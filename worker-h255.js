import h254 from './worker-h254.js';

const BUILD='H255';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H255_DECK_REVEAL_FLIP_PARITY'))return out;

  const helper=`
/* H255_DECK_REVEAL_FLIP_PARITY
   Reveal Top and Flip Deck are made authoritative here instead of depending on
   older overlay refresh chains. Draw/Mill/Scry/Shuffle/Cut and all pile/card
   interactions continue through the existing H254/H253 implementation. */
function h255PaintDeckOverlay(forceReveal=false){
  const z=$('#deckoverlay');if(!z||!z.classList.contains('on'))return;
  const c=deckVisibleCard();
  const status=z.querySelector('#deckoverlaystatus');
  if(status)status.textContent=st.deck.length+' cards · '+(st.deckFlipped?'FLIPPED · FACE UP':(!c?.faceDown?'TOP FACE UP':'FACE DOWN'));
  const wrap=z.querySelector('#deckoverlaypreview'),img=wrap?.querySelector('img');
  if(!c){if(wrap)wrap.hidden=true;img?.removeAttribute('src');return}
  const show=!!(forceReveal||!c.faceDown);
  if(wrap)wrap.hidden=!show;
  if(!show){img?.removeAttribute('src');return}
  const src=frontImage(c)||BACK;
  if(img&&img.getAttribute('src')!==src)img.setAttribute('src',src);
}

function h255SyncDeckViews(forceReveal=false){
  try{syncDeckPileVisual?.()}catch{}
  if(st.view==='full'){
    try{window.MTG_H252_syncFullBoard?.()}catch{}
    try{h253SyncPlayerFullDeckVisual?.()}catch{}
  }
  h255PaintDeckOverlay(forceReveal);
  try{window.MTG_H254_clearEmptyDeckArtwork?.()}catch{}
}

const h255BaseDeckAction=deckAction;
deckAction=async function(action){
  if(action==='reveal'){
    if(!st.deck.length){h255SyncDeckViews(false);return}
    const c=deckVisibleCard();if(!c)return;
    preview=c;deckPreviewReveal=true;
    await load(c);
    h255SyncDeckViews(true);
    return;
  }

  if(action==='flipdeck'){
    if(!st.deck.length){h255SyncDeckViews(false);return}
    /* Match the original physical Flip Deck behavior exactly: reverse the deck,
       toggle its orientation, then apply that orientation to every deck card. */
    st.deck.reverse();
    st.deckFlipped=!st.deckFlipped;
    syncDeckFaces();
    preview=deckVisibleCard();deckPreviewReveal=false;
    const c=deckVisibleCard();
    if(c&&!c.faceDown)await load(c);
    render();
    h255SyncDeckViews(false);
    return;
  }

  return h255BaseDeckAction(action);
};
`;

  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+helper+'\n/* H255_DECK_REVEAL_FLIP_PARITY_END */\n'+out.slice(end);
  else out+=helper;
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h255-empty-deck-visual'))return out;

  const css=`<style id="h255-empty-deck-visual">
/* style.css paints a card back with .deck::before even when the pile is empty.
   Empty is real game state, so suppress that pseudo-card on every board view. */
.deck.empty::before,
#deck.empty::before,
#h116-piles-you .deck.empty::before,
#h116-piles-opp .deck.empty::before,
#h157-opp-piles .deck.empty::before{
  content:''!important;
  background:none!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  out=out.replace('</body>','\n<!-- h255-empty-deck-visual -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h254.fetch(request,env,ctx);
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
