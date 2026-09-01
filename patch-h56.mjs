import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H56 patch failed: ${label}`);
  source=source.replace(from,to);
}

const oldStyle="#scrytray{position:fixed;left:8px;right:8px;z-index:46;background:rgba(27,23,20,.96);border:1px solid #806a50;border-radius:12px;padding:7px;box-shadow:0 -10px 24px #0008;max-height:178px;overflow:hidden}#scrytray[hidden]{display:none!important}.scry-head{display:flex;align-items:center;justify-content:space-between;height:25px;padding:0 3px 4px;font:900 9px/1 ui-monospace,Menlo,monospace;color:#f4eadb}.scry-private{font-size:7px;opacity:.62}.scry-row{display:flex;gap:7px;overflow-x:auto;overflow-y:hidden;padding:2px 2px 4px;scrollbar-width:none}.scry-row::-webkit-scrollbar{display:none}.scry-item{flex:0 0 88px;width:88px;display:flex;flex-direction:column;gap:4px}.scry-card{width:88px;aspect-ratio:.716;border-radius:7px;overflow:hidden;background:#111;box-shadow:0 5px 12px #0008;touch-action:none;position:relative}.scry-card img{width:100%;height:100%;object-fit:cover;pointer-events:none}.scry-card.selected{outline:3px solid #e6c456;outline-offset:1px}.scry-arrows{display:grid;grid-template-columns:1fr 1fr;gap:4px}.scry-arrows button{height:28px;border:1px solid #806a50;border-radius:7px;background:#2b231c;color:#f5ead8;font:900 17px/1 system-ui;padding:0;touch-action:manipulation}.scry-arrows button small{display:block;font:800 6px/1 ui-monospace,Menlo,monospace;margin-top:-2px}@media(max-width:390px){#scrytray{left:6px;right:6px}.scry-item,.scry-card{width:82px}.scry-item{flex-basis:82px}}";

const newStyle="#scrytray{position:fixed;z-index:44;height:196px;max-height:min(196px,31dvh);background:rgba(27,23,20,.97);border:1px solid #806a50;border-radius:12px;padding:7px 8px 8px;box-shadow:0 -10px 24px #0008;overflow:hidden}#scrytray[hidden]{display:none!important}.scry-head{display:flex;align-items:center;justify-content:space-between;height:29px;min-height:29px;padding:0 4px 5px;font:900 10px/1 ui-monospace,Menlo,monospace;color:#f4eadb}.scry-private{font-size:7px;letter-spacing:.08em;opacity:.62}.scry-row{display:flex;align-items:flex-start;gap:7px;height:calc(100% - 29px);overflow-x:auto;overflow-y:hidden;padding:2px 3px 4px;scrollbar-width:none;overscroll-behavior-x:contain}.scry-row::-webkit-scrollbar{display:none}.scry-item{flex:0 0 88px;width:88px;display:flex;flex-direction:column;gap:4px}.scry-card{width:88px;aspect-ratio:.716;border-radius:7px;overflow:hidden;background:#111;box-shadow:0 5px 12px #0008;touch-action:none;position:relative}.scry-card img{width:100%;height:100%;object-fit:cover;pointer-events:none}.scry-card.selected{outline:3px solid #e6c456;outline-offset:1px}.scry-arrows{display:grid;grid-template-columns:1fr 1fr;gap:4px}.scry-arrows button{height:29px;border:1px solid #806a50;border-radius:7px;background:#2b231c;color:#f5ead8;font:900 17px/1 system-ui;padding:0;touch-action:manipulation}.scry-arrows button small{display:block;font:800 6px/1 ui-monospace,Menlo,monospace;margin-top:-2px}@media(max-width:390px){#scrytray{height:190px;max-height:min(190px,31dvh);padding-left:7px;padding-right:7px}.scry-item,.scry-card{width:82px}.scry-item{flex-basis:82px}}";

replaceOnce('Scry tray visual style',oldStyle,newStyle);

replaceOnce(
  'Scry tray follows Hand geometry',
  "function syncScryTrayPosition(){\n  const tray=$('#scrytray'),hand=$('#hand');\n  if(!tray||!hand||tray.hidden)return;\n  const r=hand.getBoundingClientRect();\n  tray.style.bottom=Math.max(8,window.innerHeight-r.top+6)+'px';\n}",
  "function syncScryTrayPosition(){\n  const tray=$('#scrytray'),hand=$('#hand');\n  if(!tray||!hand||tray.hidden)return;\n  const r=hand.getBoundingClientRect();\n  tray.style.left=Math.round(r.left)+'px';\n  tray.style.right='auto';\n  tray.style.width=Math.round(r.width)+'px';\n  tray.style.bottom=Math.max(8,Math.round(window.innerHeight-r.top+8))+'px';\n}"
);

replaceOnce(
  'Scry render keeps Hand separate',
  "function renderScryHand(){\n  const tray=ensureScryTray(),row=$('#scryrow');\n  const visible=st.scry.length>0&&st.view==='you';tray.hidden=!visible;\n  if(!visible){if(row)row.innerHTML='';return}\n  row.innerHTML='';st.scry.forEach(id=>row.appendChild(scryCard(id)));syncScryTrayPosition();\n}",
  "function renderScryHand(){\n  const tray=ensureScryTray(),row=$('#scryrow'),hand=$('#hand');\n  const visible=st.scry.length>0&&st.view==='you';tray.hidden=!visible;\n  hand?.classList.toggle('scry-visible',visible);\n  if(!visible){if(row)row.innerHTML='';return}\n  row.innerHTML='';st.scry.forEach(id=>row.appendChild(scryCard(id)));\n  requestAnimationFrame(syncScryTrayPosition);\n}"
);

fs.writeFileSync(path,source);
console.log('Applied H56 Scry-above-Hand layout patch');
