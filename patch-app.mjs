import fs from 'node:fs';

const path = 'public/app.js';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(label, from, to) {
  if (!source.includes(from)) {
    throw new Error(`H42 patch failed: ${label} target was not found`);
  }
  source = source.replace(from, to);
}

replaceOnce(
  'card load state',
  "let seq=0,preview=null,lastTap={},selectedHand=null,deckPreviewReveal=false;",
  "let seq=0,preview=null,lastTap={},selectedHand=null,deckPreviewReveal=false;\nconst cardLoads=new Map();\nlet boardZoomCard=null,zoomStatHoldTimer=null,zoomStatHeld=false,zoomStatActivated=false,zoomStatSide='p';"
);

replaceOnce(
  'deduplicated card loader',
  "async function load(c){if(!c||(c.img&&c.faces.length))return;try{let q='/api/card?name='+encodeURIComponent(c.name);if(c.meta?.scryfallId)q+='&id='+encodeURIComponent(c.meta.scryfallId);const r=await fetch(q);if(!r.ok)return;const d=await r.json();c.img=d.image||'';c.faces=Array.isArray(d.faces)&&d.faces.length?d.faces:[{name:c.name,image:c.img}];c.isDoubleFaced=!!d.isDoubleFaced&&c.faces.length>1;c.meta.scryfallId=d.scryfallId||c.meta.scryfallId}catch{}}",
  "async function load(c){if(!c||(c.img&&c.faces.length))return;if(cardLoads.has(c.id))return cardLoads.get(c.id);const task=(async()=>{try{let q='/api/card?name='+encodeURIComponent(c.name);if(c.meta?.scryfallId)q+='&id='+encodeURIComponent(c.meta.scryfallId);const r=await fetch(q);if(!r.ok)return;const d=await r.json();c.img=d.image||'';c.faces=Array.isArray(d.faces)&&d.faces.length?d.faces:[{name:c.name,image:c.img}];c.isDoubleFaced=!!d.isDoubleFaced&&c.faces.length>1;c.meta.scryfallId=d.scryfallId||c.meta.scryfallId}catch{}finally{cardLoads.delete(c.id)}})();cardLoads.set(c.id,task);return task}"
);

replaceOnce(
  'lightweight battlefield viewer and restored counter controls',
  "function rerenderPreview(){if(preview){$('#pimg').src=deckIsPreview()?(deckPreviewReveal||st.deckFlipped?frontImage(preview)||BACK:BACK):displayImage(preview)||'';$('#state').hidden=!preview.isDoubleFaced;updateDeckPanel()}}",
  `function rerenderPreview(){if(preview){$('#pimg').src=deckIsPreview()?(deckPreviewReveal||st.deckFlipped?frontImage(preview)||BACK:BACK):displayImage(preview)||'';$('#state').hidden=!preview.isDoubleFaced;updateDeckPanel()}}
function syncTapVisual(c){if(!c)return;document.querySelectorAll('.card[data-id="'+c.id+'"]').forEach(el=>el.classList.toggle('tap',!!c.tap))}
function syncFaceVisual(c){if(!c)return;const src=displayImage(c)||'';document.querySelectorAll('.card[data-id="'+c.id+'"]').forEach(el=>{let img=el.querySelector('img');if(src){if(!img){img=document.createElement('img');img.draggable=false;el.insertBefore(img,el.firstChild)}if(img.src!==src)img.src=src}})}
function zoomStatText(c){if(!c)return '';const bits=[];if(c.p1)bits.push((c.p1>0?'+':'')+c.p1+'/'+(c.p1>0?'+':'')+c.p1);if(c.p!==null||c.t!==null)bits.push('X/X '+(c.p??0)+'/'+(c.t??0));return bits.join(' · ')||'No counters'}
function syncStatVisual(c){if(!c)return;document.querySelectorAll('.card[data-id="'+c.id+'"]').forEach(el=>{const has=!!c.p1||c.p!==null||c.t!==null;let b=el.querySelector('.badge');if(!has){if(b)b.remove();return}if(!b){b=document.createElement('div');b.className='badge';b.style.pointerEvents='none';b.setAttribute('aria-hidden','true');el.appendChild(b)}b.textContent=c.p!==null||c.t!==null?((c.p??0)+(c.p1||0))+'/'+((c.t??0)+(c.p1||0)):((c.p1>0?'+':'')+c.p1+'/'+(c.p1>0?'+':'')+c.p1)})}
function ensureBoardZoom(){let z=$('#boardzoom');if(z)return z;const style=document.createElement('style');style.textContent='#boardzoom{display:none;position:fixed;inset:0;z-index:30000;background:#050505f4;align-items:center;justify-content:center;padding:max(62px,env(safe-area-inset-top)) 12px max(196px,env(safe-area-inset-bottom));touch-action:manipulation}#boardzoom.on{display:flex}#boardzoom img{display:block;max-width:min(88vw,430px);max-height:calc(100dvh - 278px);width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 12px 36px #000}#boardzoomclose{position:fixed;right:14px;top:max(14px,env(safe-area-inset-top));z-index:30003;width:46px;height:46px;border:1px solid #8b7659;border-radius:50%;background:#211b17;color:#fff;font:700 30px/1 system-ui;display:grid;place-items:center;padding:0}#boardzoomreadout{position:fixed;left:14px;top:max(16px,env(safe-area-inset-top));z-index:30002;max-width:calc(100vw - 82px);padding:9px 11px;border:1px solid #6c5a45;border-radius:9px;background:#18130fee;color:#f0dcb7;font:900 14px/1.15 ui-monospace,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#boardzoomcontrols{position:fixed;left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom));z-index:30002;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:8px;border:1px solid #5d4b39;border-radius:12px;background:#18130ff2;box-shadow:0 -8px 24px #0008}#boardzoomcontrols button{min-height:42px;border:1px solid #806a50;border-radius:8px;background:#2b231c;color:#f5ead8;font:800 9px/1.1 ui-monospace,Menlo,monospace;padding:6px 4px;touch-action:manipulation}#boardzoomcontrols .danger{border-color:#7f4c45}.zsplit{display:flex!important;align-items:stretch!important;padding:0!important;overflow:hidden}.zsplit>span{flex:1;display:grid;place-items:center;min-width:0;padding:6px 2px}.zsplit>span+span{border-left:1px solid #806a50}.zstats:not(.active)>span{flex:1;border-left:0}.zstats.active>span{font-size:15px;font-weight:900}.zstats.active>span:first-child:after{content:" P";font-size:7px;opacity:.65;margin-left:2px}.zstats.active>span:last-child:after{content:" T";font-size:7px;opacity:.65;margin-left:2px}@media(max-width:390px){#boardzoom{padding-bottom:max(194px,env(safe-area-inset-bottom))}#boardzoom img{max-height:calc(100dvh - 270px)}#boardzoomcontrols{gap:5px}#boardzoomcontrols button{min-height:40px;font-size:8px}}';document.head.appendChild(style);z=document.createElement('div');z.id='boardzoom';z.innerHTML='<button id="boardzoomclose" aria-label="Close card">×</button><div id="boardzoomreadout">No counters</div><img alt="Card preview" decoding="async"><div id="boardzoomcontrols"><button data-zact="tap">Tap</button><button data-zact="flip">Flip</button><button data-zact="state">Other Side</button><button data-zact="counter" class="zsplit"><span>+1/+1</span><span>−1/−1</span></button><button data-zact="stats" class="zsplit zstats"><span>X/X</span></button><button data-zact="hand">To Hand</button><button data-zact="discard" class="danger">Discard</button><button data-zact="exile">Exile</button></div>';document.body.appendChild(z);const close=()=>{clearTimeout(zoomStatHoldTimer);zoomStatHoldTimer=null;zoomStatHeld=false;zoomStatActivated=false;z.classList.remove('on');const img=z.querySelector('img');img.removeAttribute('src');boardZoomCard=null};z.addEventListener('pointerdown',e=>{const b=e.target.closest?.('button[data-zact="stats"]');if(!b||!boardZoomCard)return;e.preventDefault();e.stopPropagation();const c=boardZoomCard;clearTimeout(zoomStatHoldTimer);zoomStatHeld=false;zoomStatActivated=false;if(c.p===null&&c.t===null){c.p=0;c.t=0;zoomStatActivated=true;syncStatVisual(c);refreshBoardZoom();return}const r=b.getBoundingClientRect();zoomStatSide=e.clientX<r.left+r.width/2?'p':'t';try{b.setPointerCapture?.(e.pointerId)}catch{}zoomStatHoldTimer=setTimeout(()=>{if(boardZoomCard!==c)return;c[zoomStatSide]=(c[zoomStatSide]??0)-1;zoomStatHeld=true;syncStatVisual(c);refreshBoardZoom()},500)},true);z.addEventListener('pointerup',e=>{const b=e.target.closest?.('button[data-zact="stats"]');if(!b||!boardZoomCard)return;e.preventDefault();e.stopPropagation();clearTimeout(zoomStatHoldTimer);zoomStatHoldTimer=null;const c=boardZoomCard;if(zoomStatActivated){zoomStatActivated=false;zoomStatHeld=false;return}if(!zoomStatHeld){c[zoomStatSide]=(c[zoomStatSide]??0)+1;syncStatVisual(c);refreshBoardZoom()}zoomStatHeld=false;try{b.releasePointerCapture?.(e.pointerId)}catch{}},true);z.addEventListener('pointercancel',()=>{clearTimeout(zoomStatHoldTimer);zoomStatHoldTimer=null;zoomStatHeld=false;zoomStatActivated=false},true);z.addEventListener('click',async e=>{if(e.target===z||e.target.closest?.('#boardzoomclose')){close();return}const b=e.target.closest?.('button[data-zact]');if(!b||!boardZoomCard)return;e.preventDefault();e.stopPropagation();const c=boardZoomCard,a=b.dataset.zact;if(a==='stats')return;if(a==='tap'){c.tap=!c.tap;syncTapVisual(c);refreshBoardZoom();return}if(a==='flip'){c.faceDown=!c.faceDown;syncFaceVisual(c);refreshBoardZoom();return}if(a==='state'){if(c.isDoubleFaced&&c.faces.length>1){c.stateIndex=(c.stateIndex+1)%c.faces.length;syncFaceVisual(c);refreshBoardZoom()}return}if(a==='counter'){const r=b.getBoundingClientRect();c.p1=(c.p1||0)+(e.clientX<r.left+r.width/2?1:-1);syncStatVisual(c);refreshBoardZoom();return}if(a==='hand'||a==='discard'||a==='exile'){const zone=a==='hand'?'hand':a;putInZone(c.id,zone);revealForZone(c,zone);if(!c.faceDown&&!c.img)await load(c);close();render();return}});return z}
function refreshBoardZoom(){const z=$('#boardzoom'),c=boardZoomCard;if(!z||!c)return;const img=z.querySelector('img'),src=displayImage(c)||'';if(src&&img.getAttribute('src')!==src)img.src=src;z.querySelector('#boardzoomreadout').textContent=zoomStatText(c);const tap=z.querySelector('[data-zact="tap"]');if(tap)tap.textContent=c.tap?'Untap':'Tap';const state=z.querySelector('[data-zact="state"]');if(state)state.hidden=!(c.isDoubleFaced&&c.faces.length>1);const stats=z.querySelector('[data-zact="stats"]');if(stats){const active=c.p!==null||c.t!==null;stats.classList.toggle('active',active);stats.innerHTML=active?'<span>'+(c.p??0)+'</span><span>'+(c.t??0)+'</span>':'<span>X/X</span>'}}
async function openBoardZoom(c){if(!c)return;const z=ensureBoardZoom(),img=z.querySelector('img');boardZoomCard=c;img.removeAttribute('src');z.classList.add('on');refreshBoardZoom();if(!c.faceDown&&!frontImage(c)){await load(c);if(boardZoomCard===c&&z.classList.contains('on'))refreshBoardZoom()}}`
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
console.log('Applied H42 split counter and X/X behavior patch to public/app.js');
