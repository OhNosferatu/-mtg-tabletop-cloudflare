import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H57 patch failed: ${label}`);
  source=source.replace(from,to);
}

replaceOnce(
  'stacked Scry and Hand style',
  "@media(max-width:390px){#scrytray{height:190px;max-height:min(190px,31dvh);padding-left:7px;padding-right:7px}.scry-item,.scry-card{width:82px}.scry-item{flex-basis:82px}}",
  "#hand.hand.scry-visible{height:190px!important;transform:translateY(0)!important;padding:6px!important;overflow:hidden!important}#hand.hand.scry-visible .handhead{display:flex!important;height:34px!important;min-height:34px!important;align-items:center!important;justify-content:space-between!important}#hand.hand.scry-visible #handrow{display:flex!important;flex-flow:row nowrap!important;align-items:flex-start!important;gap:6px!important;width:100%!important;height:126px!important;padding:5px 2px 8px!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important;touch-action:none!important}#hand.hand.scry-visible #handrow::-webkit-scrollbar{display:none!important}#hand.hand.scry-visible #handrow>.hcard{flex:0 0 calc((100% - 24px)/5)!important;width:calc((100% - 24px)/5)!important;min-width:calc((100% - 24px)/5)!important;height:auto!important;aspect-ratio:.716!important;border-radius:6px!important;touch-action:none!important}#hand.hand.scry-visible .hand-scroll-wrap{display:flex!important;height:22px!important;padding:2px 4px 0!important;align-items:center!important}@media(max-width:390px){#scrytray{height:190px;max-height:min(190px,31dvh);padding-left:7px;padding-right:7px}.scry-item,.scry-card{width:82px}.scry-item{flex-basis:82px}#hand.hand.scry-visible{height:184px!important}#hand.hand.scry-visible #handrow{gap:5px!important;height:120px!important}#hand.hand.scry-visible #handrow>.hcard{flex-basis:calc((100% - 20px)/5)!important;width:calc((100% - 20px)/5)!important;min-width:calc((100% - 20px)/5)!important}}"
);

fs.writeFileSync(path,source);
console.log('Applied H57 explicit stacked Scry + Hand layout patch');
