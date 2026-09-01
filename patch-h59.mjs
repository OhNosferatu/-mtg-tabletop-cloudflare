import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H59 patch failed: ${label}`);
  source=source.replace(from,to);
}

replaceOnce(
  'compact Hand peek while Scry is active',
  "  document.head.appendChild(style);\n  tray=document.createElement('aside');",
  "  document.head.appendChild(style);\n  const peekStyle=document.createElement('style');\n  peekStyle.textContent='#hand.hand.scry-visible{height:68px!important;transform:translateY(0)!important;padding:4px 6px!important;overflow:hidden!important}#hand.hand.scry-visible .handhead{display:flex!important;height:19px!important;min-height:19px!important;padding:0 2px!important;align-items:center!important;font-size:8px!important}#hand.hand.scry-visible #closehand,#hand.hand.scry-visible .hand-build{display:none!important}#hand.hand.scry-visible #handrow{display:flex!important;flex-flow:row nowrap!important;align-items:flex-start!important;gap:5px!important;width:100%!important;height:43px!important;padding:2px!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important;touch-action:none!important}#hand.hand.scry-visible #handrow::-webkit-scrollbar{display:none!important}#hand.hand.scry-visible #handrow>.hcard{flex:0 0 calc((100% - 20px)/5)!important;width:calc((100% - 20px)/5)!important;min-width:calc((100% - 20px)/5)!important;height:auto!important;aspect-ratio:.716!important;border-radius:5px!important;overflow:hidden!important;touch-action:none!important}#hand.hand.scry-visible #handrow>.hcard img{width:100%!important;height:100%!important;object-fit:cover!important;object-position:top!important}#hand.hand.scry-visible .hand-scroll-wrap{display:none!important}@media(max-width:390px){#hand.hand.scry-visible{height:64px!important}#hand.hand.scry-visible .handhead{height:18px!important;min-height:18px!important}#hand.hand.scry-visible #handrow{height:40px!important}}';\n  document.head.appendChild(peekStyle);\n  tray=document.createElement('aside');"
);

fs.writeFileSync(path,source);
console.log('Applied H59 compact Hand peek during Scry patch');
