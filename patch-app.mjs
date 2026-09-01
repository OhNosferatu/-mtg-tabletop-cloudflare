import fs from 'node:fs';

const path = 'public/app.js';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(label, from, to) {
  if (!source.includes(from)) {
    throw new Error(`H39 patch failed: ${label} target was not found`);
  }
  source = source.replace(from, to);
}

replaceOnce(
  'card load state',
  "let seq=0,preview=null,lastTap={},selectedHand=null,deckPreviewReveal=false;",
  "let seq=0,preview=null,lastTap={},selectedHand=null,deckPreviewReveal=false;\nconst cardLoads=new Map();"
);

replaceOnce(
  'deduplicated card loader',
  "async function load(c){if(!c||(c.img&&c.faces.length))return;try{let q='/api/card?name='+encodeURIComponent(c.name);if(c.meta?.scryfallId)q+='&id='+encodeURIComponent(c.meta.scryfallId);const r=await fetch(q);if(!r.ok)return;const d=await r.json();c.img=d.image||'';c.faces=Array.isArray(d.faces)&&d.faces.length?d.faces:[{name:c.name,image:c.img}];c.isDoubleFaced=!!d.isDoubleFaced&&c.faces.length>1;c.meta.scryfallId=d.scryfallId||c.meta.scryfallId}catch{}}",
  "async function load(c){if(!c||(c.img&&c.faces.length))return;if(cardLoads.has(c.id))return cardLoads.get(c.id);const task=(async()=>{try{let q='/api/card?name='+encodeURIComponent(c.name);if(c.meta?.scryfallId)q+='&id='+encodeURIComponent(c.meta.scryfallId);const r=await fetch(q);if(!r.ok)return;const d=await r.json();c.img=d.image||'';c.faces=Array.isArray(d.faces)&&d.faces.length?d.faces:[{name:c.name,image:c.img}];c.isDoubleFaced=!!d.isDoubleFaced&&c.faces.length>1;c.meta.scryfallId=d.scryfallId||c.meta.scryfallId}catch{}finally{cardLoads.delete(c.id)}})();cardLoads.set(c.id,task);return task}"
);

replaceOnce(
  'lightweight tap visual helper',
  "function rerenderPreview(){if(preview){$('#pimg').src=deckIsPreview()?(deckPreviewReveal||st.deckFlipped?frontImage(preview)||BACK:BACK):displayImage(preview)||'';$('#state').hidden=!preview.isDoubleFaced;updateDeckPanel()}}",
  "function rerenderPreview(){if(preview){$('#pimg').src=deckIsPreview()?(deckPreviewReveal||st.deckFlipped?frontImage(preview)||BACK:BACK):displayImage(preview)||'';$('#state').hidden=!preview.isDoubleFaced;updateDeckPanel()}}\nfunction syncTapVisual(c){if(!c)return;document.querySelectorAll('.card[data-id=\"'+c.id+'\"]').forEach(el=>el.classList.toggle('tap',!!c.tap))}"
);

replaceOnce(
  'double-tap timer cleanup',
  "clearTimeout(lastTap[c.id+'_timer']);lastTap[c.id]=0;openCard(c,true)",
  "clearTimeout(lastTap[c.id+'_timer']);delete lastTap[c.id+'_timer'];lastTap[c.id]=0;openCard(c,true)"
);

replaceOnce(
  'single-tap lightweight update',
  "lastTap[c.id+'_timer']=setTimeout(()=>{if(lastTap[c.id]===now){c.tap=!c.tap;lastTap[c.id]=0;render()}},330)",
  "lastTap[c.id+'_timer']=setTimeout(()=>{if(lastTap[c.id]===now){c.tap=!c.tap;lastTap[c.id]=0;delete lastTap[c.id+'_timer'];syncTapVisual(c)}},330)"
);

replaceOnce(
  'preview tap lightweight update',
  "$('#tap').onclick=()=>{if(preview){preview.tap=!preview.tap;render();rerenderPreview()}};",
  "$('#tap').onclick=()=>{if(preview){preview.tap=!preview.tap;syncTapVisual(preview);rerenderPreview()}};"
);

fs.writeFileSync(path, source);
console.log('Applied H39 iOS card interaction stability patch to public/app.js');
