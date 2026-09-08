import h252 from './worker-h252.js';

const BUILD='H253';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H253_FULLBOARD_DECK_AND_SNAP_PARITY'))return out;

  /* H99 deliberately set the normal player pile overlap threshold to 60%.
     H117's Full Board snap helper also uses 60%. H252 accidentally reintroduced
     an 80% threshold in its final Full Board gesture wrapper. Change only that
     H252 helper so the dedicated screens are otherwise untouched. */
  const snapStart=out.indexOf('function h252FullPileTarget(');
  const snapEnd=snapStart>=0?out.indexOf('/* H124 remains the one battlefield gesture recognizer.',snapStart):-1;
  if(snapStart>=0&&snapEnd>snapStart){
    const section=out.slice(snapStart,snapEnd).replace('if(ratio>=.8&&ratio>bestRatio)','if(ratio>=.6&&ratio>bestRatio)');
    out=out.slice(0,snapStart)+section+out.slice(snapEnd);
  }

  /* The Scry tray was originally restricted to st.view==='you'. Scrying while
     the Full Board is active therefore moved the real card out of the deck but
     hid the private Scry tray after the deck overlay closed. Full Board still
     represents the player's own view, so allow the same private Scry UI there. */
  out=out.replace(
    "const visible=st.scry.length>0&&st.view==='you';tray.hidden=!visible;",
    "const visible=st.scry.length>0&&(st.view==='you'||st.view==='full');tray.hidden=!visible;/* H253_FULLBOARD_DECK_AND_SNAP_PARITY */"
  );

  /* H117's Full Board deck mirror historically looked only at st.deckFlipped.
     The dedicated player deck uses the actual visible-card state plus the
     temporary Reveal Top state. Use that same source of truth for Full Board. */
  out=out.replace(
    "const img=document.createElement('img'),flipped=owner==='you'?st.deckFlipped:!!st.oppPublic.deckFlipped;img.src=flipped?(frontImage(c)||BACK):BACK;img.draggable=false;el.appendChild(img)",
    "const img=document.createElement('img'),faceUp=owner==='you'?(deckPreviewReveal||deckVisibleFaceUp()):!!st.oppPublic.deckFlipped;img.src=faceUp?(frontImage(c)||BACK):BACK;img.draggable=false;el.appendChild(img)"
  );

  const helper=`
/* H253_FULLBOARD_DECK_AND_SNAP_PARITY
   Deck actions remain canonical player-deck actions. This wrapper only repairs
   Full Board presentation after those actions and provides a narrow fallback if
   an older overlay path fails to commit Flip Deck. */
function h253SyncPlayerFullDeckVisual(){
  const pile=document.querySelector('#h116-piles-you [data-h117-zone="deck"],#h116-piles-you .h116-deck');
  if(!pile)return;
  const badge=pile.querySelector('.count');if(badge)badge.textContent=String(st.deck.length);
  const c=deckVisibleCard();
  if(!c){pile.querySelectorAll(':scope>img').forEach(img=>img.remove());pile.classList.add('empty');return}
  pile.classList.remove('empty');
  let img=pile.querySelector(':scope>img');
  if(!img){img=document.createElement('img');img.draggable=false;pile.insertBefore(img,pile.firstChild)}
  const showFace=!!(deckPreviewReveal||deckVisibleFaceUp());
  const src=showFace?(frontImage(c)||BACK):BACK;
  if(img.getAttribute('src')!==src)img.setAttribute('src',src);
}

const h253BaseDeckAction=deckAction;
deckAction=async function(action){
  const beforeFlip=!!st.deckFlipped;
  await h253BaseDeckAction(action);

  /* H67 intentionally waits until the deck overlay closes before showing Scry.
     Preserve that behavior, but renderScryHand now also supports Full Board. */
  if(action==='scry'&&Array.isArray(st.scry)&&st.scry.length)deckExitShowScry=true;

  /* Reveal Top is temporary public presentation, not a permanent face-state
     mutation. Guarantee the overlay has the current card loaded and visible. */
  if(action==='reveal'){
    const c=deckVisibleCard();
    if(c){preview=c;deckPreviewReveal=true;await load(c)}
  }

  /* Flip Deck should always reverse the deck and toggle its physical face state.
     If the inherited action already did so, leave it alone. The fallback runs
     only when the state did not change. */
  if(action==='flipdeck'){
    if(st.deck.length&&!!st.deckFlipped===beforeFlip){
      st.deck.reverse();st.deckFlipped=!beforeFlip;syncDeckFaces();render();
    }
    const c=deckVisibleCard();if(c&&deckVisibleFaceUp())await load(c);
  }

  if(action==='reveal'||action==='flipdeck'){
    renderDeckOverlay();
    h253SyncPlayerFullDeckVisual();
  }
  if(st.view==='full')requestAnimationFrame(()=>{window.MTG_H252_syncFullBoard?.();h253SyncPlayerFullDeckVisual()});
};
`;

  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+helper+'\n/* H253_FULLBOARD_DECK_AND_SNAP_PARITY_END */\n'+out.slice(end);
  else out+=helper;
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h253-fullboard-deck-and-snap-parity'))return out;
  const script=`<script id="h253-fullboard-deck-and-snap-parity">window.addEventListener('DOMContentLoaded',()=>{
    /* Keep the Full Board mirror current after the dedicated deck overlay closes,
       especially after temporary Reveal Top and deferred Scry presentation. */
    document.addEventListener('click',e=>{
      if(!e.target.closest?.('#deckoverlayclose,#deckoverlay,[data-deck-action]'))return;
      setTimeout(()=>{window.MTG_H252_syncFullBoard?.()},0);
      setTimeout(()=>{window.MTG_H252_syncFullBoard?.()},80);
    },true);
  });</script>`;
  out=out.replace('</body>',script+'\n<!-- h253-fullboard-deck-and-snap-parity -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h252.fetch(request,env,ctx);
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
