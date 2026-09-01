import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H61 patch failed: ${label}`);
  source=source.replace(from,to);
}

// The deck zone's legacy ::before card-back sits above the real <img>.
// Hide it whenever the deck is non-empty so the actual top-card image controls
// whether the pile shows a Magic back or a face-up card.
replaceOnce(
  'deck rendered image is authoritative',
  "const toast=()=>{};",
  "const toast=()=>{};const deckFaceStyle=document.createElement('style');deckFaceStyle.textContent='#deck:not(.empty)::before{display:none!important}#deck>img{z-index:4!important}';document.head.appendChild(deckFaceStyle);"
);

// Dragging the top card off the deck should use that card's actual orientation,
// not the deck-wide flipped flag.
replaceOnce(
  'deck drag preserves visible face',
  "zoneDrag(el,id,from,{forceBack:el.id==='deck'?!st.deckFlipped:forceBack,label})",
  "zoneDrag(el,id,from,{forceBack:el.id==='deck'?!!c.faceDown:forceBack,label})"
);

// A long-pressed Hand card released directly over the Deck should become the
// actual top card rather than a battlefield card visually overlapping the zone.
replaceOnce(
  'hand drop directly onto deck',
  "const fr=fieldRect();if(pointInRect(e.clientX,e.clientY,fr)&&!handHit(e.clientX,e.clientY)){placeOnField(id,e.clientX,e.clientY,false);render();return}render();return",
  "const dz=$('#deck');if(dz&&pointInRect(e.clientX,e.clientY,dz.getBoundingClientRect())){c.faceDown=false;moveAndMaybeLoad(id,'deck',true);return}const fr=fieldRect();if(pointInRect(e.clientX,e.clientY,fr)&&!handHit(e.clientX,e.clientY)){placeOnField(id,e.clientX,e.clientY,false);render();return}render();return"
);

// Recalculate the custom Hand range slider after render-driven hand rebuilds.
// Mulligan replaces all hand-card DOM nodes at once, so a child-list observer
// schedules the measurement after layout has settled.
replaceOnce(
  'hand scrollbar rebuild observer',
  "$('#handscroll')?.addEventListener('input',e=>{const row=$('#handrow');if(row)row.scrollLeft=+e.target.value||0});$('#handrow')?.addEventListener('scroll',updateHandScrollerFromRow,{passive:true});",
  "$('#handscroll')?.addEventListener('input',e=>{const row=$('#handrow');if(row)row.scrollLeft=+e.target.value||0});$('#handrow')?.addEventListener('scroll',updateHandScrollerFromRow,{passive:true});const handRowForScroll=$('#handrow');if(handRowForScroll)new MutationObserver(()=>requestAnimationFrame(()=>requestAnimationFrame(syncHandScroller))).observe(handRowForScroll,{childList:true});"
);

// Reset a mulliganed hand to the start of its scroll range, then re-measure it.
replaceOnce(
  'mulligan resets and refreshes hand scrollbar',
  "async function mulligan(){if(!st.deck.length&&!st.hand.length)return;while(st.hand.length){const id=st.hand.pop();st.cards[id].zone='deck';st.deck.push(id)}shuffle(st.deck);syncDeckFaces();const loads=[];for(let i=0;i<7&&st.deck.length;i++){const id=st.deck.shift(),c=st.cards[id];c.zone='hand';c.faceDown=false;st.hand.push(id);loads.push(load(c))}await Promise.all(loads);selectedHand=null;$('#hand').classList.remove('open');render()}",
  "async function mulligan(){if(!st.deck.length&&!st.hand.length)return;while(st.hand.length){const id=st.hand.pop();st.cards[id].zone='deck';st.deck.push(id)}shuffle(st.deck);syncDeckFaces();const loads=[];for(let i=0;i<7&&st.deck.length;i++){const id=st.deck.shift(),c=st.cards[id];c.zone='hand';c.faceDown=false;st.hand.push(id);loads.push(load(c))}await Promise.all(loads);selectedHand=null;$('#hand').classList.remove('open');render();const row=$('#handrow'),bar=$('#handscroll');if(row)row.scrollLeft=0;if(bar)bar.value=0;requestAnimationFrame(()=>requestAnimationFrame(syncHandScroller))}"
);

fs.writeFileSync(path,source);
console.log('Applied H61 deck-face display and mulligan scrollbar patch');
