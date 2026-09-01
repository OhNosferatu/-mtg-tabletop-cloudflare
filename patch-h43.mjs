import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!source.includes(from)) throw new Error(`H44 patch failed: ${label} target was not found`);
  source=source.replace(from,to);
}

// Make the full-card viewer smaller and let the battlefield show through.
replaceOnce('transparent zoom background','background:#050505f4','background:rgba(5,5,5,.62)');
replaceOnce('smaller zoom width','max-width:min(88vw,430px)','max-width:min(76vw,360px)');
replaceOnce('smaller zoom height','max-height:calc(100dvh - 278px)','max-height:calc(100dvh - 310px)');
replaceOnce('smaller mobile zoom height','max-height:calc(100dvh - 270px)','max-height:calc(100dvh - 300px)');

// Hide the old top-left readout and add a card-relative counter pill at the
// lower-right, just above the card's printed power/toughness box.
replaceOnce(
  'zoom style insertion point',
  '#boardzoomcontrols .danger{border-color:#7f4c45}.zsplit',
  '#boardzoomcontrols .danger{border-color:#7f4c45}#boardzoomreadout{display:none!important}#boardzoomcardwrap{position:relative;display:flex;align-items:center;justify-content:center;width:max-content;max-width:min(76vw,360px);max-height:calc(100dvh - 310px)}#boardzoomcardstats{position:absolute;right:5%;bottom:7.5%;z-index:4;min-width:58px;max-width:58%;padding:6px 8px;border:1px solid #eedca8;border-radius:8px;background:rgba(18,14,12,.88);color:#fff;font:900 12px/1.05 ui-monospace,Menlo,monospace;text-align:center;white-space:pre-line;box-shadow:0 2px 8px #0009}#boardzoomcardstats[hidden]{display:none!important}.zsplit'
);

replaceOnce(
  'zoom card wrapper',
  '<div id="boardzoomreadout">No counters</div><img alt="Card preview" decoding="async">',
  '<div id="boardzoomreadout" hidden></div><div id="boardzoomcardwrap"><img alt="Card preview" decoding="async"><div id="boardzoomcardstats" hidden></div></div>'
);

// Keep +1/+1 and base P/T as separate concepts. The base display is only the
// numeric P/T value; do not prefix it with the literal text "X/X".
replaceOnce(
  'remove X/X label from zoom display',
  "if(c.p!==null||c.t!==null)bits.push('X/X '+(c.p??0)+'/'+(c.t??0));",
  "if(c.p!==null||c.t!==null)bits.push((c.p??0)+'/'+(c.t??0));"
);

replaceOnce(
  'zoom counter text separation',
  "return bits.join(' · ')||'No counters'",
  "return bits.join('\\n')||''"
);

replaceOnce(
  'zoom counter placement',
  "z.querySelector('#boardzoomreadout').textContent=zoomStatText(c);",
  "const zr=z.querySelector('#boardzoomcardstats'),zt=zoomStatText(c);if(zr){zr.textContent=zt;zr.hidden=!zt;}"
);

replaceOnce(
  'live battlefield badge separation',
  "b.textContent=c.p!==null||c.t!==null?((c.p??0)+(c.p1||0))+'/'+((c.t??0)+(c.p1||0)):((c.p1>0?'+':'')+c.p1+'/'+(c.p1>0?'+':'')+c.p1)",
  "const bits=[];if(c.p1)bits.push('<span class=\"counter-line\">'+(c.p1>0?'+':'')+c.p1+'/'+(c.p1>0?'+':'')+c.p1+'</span>');if(c.p!==null||c.t!==null)bits.push('<span class=\"base-line\">'+(c.p??0)+'/'+(c.t??0)+'</span>');b.classList.add('counter-stack');b.innerHTML=bits.join('')"
);

replaceOnce(
  'rendered battlefield badge separation',
  "b.textContent=c.p!==null||c.t!==null?((c.p??0)+c.p1)+'/'+((c.t??0)+c.p1):'+'+c.p1+'/+'+c.p1;",
  "const bits=[];if(c.p1)bits.push('<span class=\"counter-line\">'+(c.p1>0?'+':'')+c.p1+'/'+(c.p1>0?'+':'')+c.p1+'</span>');if(c.p!==null||c.t!==null)bits.push('<span class=\"base-line\">'+(c.p??0)+'/'+(c.t??0)+'</span>');b.classList.add('counter-stack');b.innerHTML=bits.join('');"
);

fs.writeFileSync(path,source);
console.log('Applied H44 zoom counter-position and label patch to public/app.js');
