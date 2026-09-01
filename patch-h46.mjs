import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from)) throw new Error(`H46 patch failed: ${label} target was not found`);
  source=source.replace(from,to);
}

// Battlefield-only display: when base X/X is active, show the final combined
// P/T after applying +1/+1 counters. Keep the two controls independent in the
// full-screen viewer.
replaceOnce(
  'live battlefield combined P/T',
  "const bits=[];if(c.p1)bits.push('<span class=\"counter-line\">'+(c.p1>0?'+':'')+c.p1+'/'+(c.p1>0?'+':'')+c.p1+'</span>');if(c.p!==null||c.t!==null)bits.push('<span class=\"base-line\">'+(c.p??0)+'/'+(c.t??0)+'</span>');b.classList.add('counter-stack');b.innerHTML=bits.join('')",
  "const hasBase=c.p!==null||c.t!==null;const value=hasBase?((c.p??0)+(c.p1||0))+'/'+((c.t??0)+(c.p1||0)):((c.p1>0?'+':'')+(c.p1||0)+'/'+(c.p1>0?'+':'')+(c.p1||0));b.classList.add('counter-stack');b.innerHTML='<span class=\"counter-line\">'+value+'</span>'"
);

replaceOnce(
  'rendered battlefield combined P/T',
  "const bits=[];if(c.p1)bits.push('<span class=\"counter-line\">'+(c.p1>0?'+':'')+c.p1+'/'+(c.p1>0?'+':'')+c.p1+'</span>');if(c.p!==null||c.t!==null)bits.push('<span class=\"base-line\">'+(c.p??0)+'/'+(c.t??0)+'</span>');b.classList.add('counter-stack');b.innerHTML=bits.join('');",
  "const hasBase=c.p!==null||c.t!==null;const value=hasBase?((c.p??0)+(c.p1||0))+'/'+((c.t??0)+(c.p1||0)):((c.p1>0?'+':'')+(c.p1||0)+'/'+(c.p1>0?'+':'')+(c.p1||0));b.classList.add('counter-stack');b.innerHTML='<span class=\"counter-line\">'+value+'</span>';"
);

fs.writeFileSync(path,source);
console.log('Applied H46 combined battlefield P/T display patch to public/app.js');
