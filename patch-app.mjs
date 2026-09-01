import fs from 'node:fs';

const path = 'public/app.js';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(label, from, to) {
  if (!source.includes(from)) {
    throw new Error(`H40 patch failed: ${label} target was not found`);
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
  'lightweight tap and zoom helpers',
  "function rerenderPreview(){if(preview){$('#pimg').src=deckIsPreview()?(deckPreviewReveal||st.deckFlipped?frontImage(preview)||BACK:BACK):displayImage(preview)||'';$('#state').hidden=!preview.isDoubleFaced;updateDeckPanel()}}",
  "function rerenderPreview(){if(preview){$('#pimg').src=deckIsPreview()?(deckPreviewReveal||st.deckFlipped?frontImage(preview)||BACK:BACK):displayImage(preview)||'';$('#state').hidden=!preview.isDoubleFaced;updateDeckPanel()}}\nfunction syncTapVisual(c){if(!c)return;document.querySelectorAll('.card[data-id=\\\"'+c.id+'\\\"]').forEach(el=>el.classList.toggle('tap',!!c.tap))}\nfunction ensureBoardZoom(){let z=$('#boardzoom');if(z)return z;const style=document.createElement('style');style.textContent='#boardzoom{display:none;position:fixed;inset:0;z-index:30000;background:#050505f2;align-items:center;justify-content:center;padding:max(64px,env(safe-area-inset-top)) 14px max(28px,env(safe-area-inset-bottom));touch-action:manipulation}#boardzoom.on{display:flex}#boardzoom img{display:block;max-width:min(92vw,430px);max-height:calc(100dvh - 110px);width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 12px 36px #000}#boardzoomclose{position:fixed;right:14px;top:max(14px,env(safe-area-inset-top));z-index:30001;width:46px;height:46px;border:1px solid #8b7659;border-radius:50%;background:#211b17;color:#fff;font:700 30px/1 system-ui;display:grid;place-items:center;padding:0}';document.head.appendChild(style);z=document.createElement('div');z.id='boardzoom';z.innerHTML='<button id=\\\"boardzoomclose\\\" aria-label=\\\"Close card\\\">×</button><img alt=\\\"Card preview\\\" decoding=\\\"async\\\">';document.body.appendChild(z);const close=()=>{z.classList.remove('on');const img=z.querySelector('img');img.removeAttribute('src')};z.addEventListener('click',e=>{if(e.target===z||e.target.closest?.('#boardzoomclose'))close()});return z}\nasync function openBoardZoom(c){if(!c)return;const z=ensureBoardZoom(),img=z.querySelector('img');img.removeAttribute('src');z.classList.add('on');let src=displayImage(c)||'';if(src)img.src=src;if(!c.faceDown&&!frontImage(c)){await load(c);if(z.classList.contains('on')){src=displayImage(c)||'';if(src)img.src=src}}}"
);

replaceOnce(
  'full-board lightweight preview',
  "if(!movable){d.onclick=()=>openCard(c,false);return d}",
  "if(!movable){d.onclick=()=>openBoardZoom(c);return d}"
);

replaceOnce(
  'double-tap lightweight board zoom',
  "clearTimeout(lastTap[c.id+'_timer']);lastTap[c.id]=0;openCard(c,true)",
  "clearTimeout(lastTap[c.id+'_timer']);delete lastTap[c.id+'_timer'];lastTap[c.id]=0;openBoardZoom(c)"
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
console.log('Applied H40 iOS battlefield zoom stability patch to public/app.js');
