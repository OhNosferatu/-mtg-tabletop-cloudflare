import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from))throw new Error(`H62 patch failed: ${label}`);
  source=source.replace(from,to);
}

replaceOnce(
  'refresh Hand scrollbar when tray opens or resizes',
  "const handRowForScroll=$('#handrow');if(handRowForScroll)new MutationObserver(()=>requestAnimationFrame(()=>requestAnimationFrame(syncHandScroller))).observe(handRowForScroll,{childList:true});",
  "const handRowForScroll=$('#handrow');if(handRowForScroll)new MutationObserver(()=>requestAnimationFrame(()=>requestAnimationFrame(syncHandScroller))).observe(handRowForScroll,{childList:true});const handForScroll=$('#hand');if(handForScroll)new MutationObserver(()=>requestAnimationFrame(()=>requestAnimationFrame(syncHandScroller))).observe(handForScroll,{attributes:true,attributeFilter:['class','style']});if(window.ResizeObserver&&handRowForScroll)new ResizeObserver(()=>requestAnimationFrame(syncHandScroller)).observe(handRowForScroll);"
);

fs.writeFileSync(path,source);
console.log('Applied H62 Hand open/resize scrollbar refresh patch');
