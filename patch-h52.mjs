import fs from 'node:fs';

const path='public/app.js';
let source=fs.readFileSync(path,'utf8');

const start=source.indexOf('function zoneDrag(el,id,from,{forceBack=false,label=\'\'}={}){');
const end=source.indexOf('\nfunction syncHandScroller()',start);
if(start<0||end<0)throw new Error('H52 patch failed: zoneDrag block not found');

const replacement=`function zoneDrag(el,id,from,{forceBack=false,label=''}={}){const c=st.cards[id];if(!c)return;let s=null,ghost=null,moved=false,captured=false;el.onpointerdown=e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();s={x:e.clientX,y:e.clientY,pid:e.pointerId};moved=false;captured=false};el.onpointermove=e=>{if(!s)return;const dist=Math.hypot(e.clientX-s.x,e.clientY-s.y);if(!moved&&dist>8){moved=true;try{el.setPointerCapture?.(e.pointerId);captured=true}catch{}ghost=makeGhost(c,forceBack)}if(ghost){e.preventDefault();ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px'}};el.onpointerup=async e=>{if(!s)return;const pid=s.pid;s=null;if(captured){try{el.releasePointerCapture?.(pid)}catch{}captured=false}ghost?.remove();ghost=null;if(!moved){if(from==='deck'){setTimeout(()=>{if(c.zone==='deck'&&st.deck.includes(c.id))openDeckOptions()},0);return}openCard(c,true);return}if(handHit(e.clientX,e.clientY)){await moveToHandAt(id,e.clientX);return}const r=fieldRect();if(pointInRect(e.clientX,e.clientY,r)){placeOnField(id,e.clientX,e.clientY,forceBack);if(!forceBack&&!c.img)await load(c);render()}};el.onpointercancel=e=>{if(captured){try{el.releasePointerCapture?.(e.pointerId)}catch{}}s=null;captured=false;ghost?.remove();ghost=null;moved=false};el.oncontextmenu=e=>e.preventDefault()}`;

source=source.slice(0,start)+replacement+source.slice(end);
fs.writeFileSync(path,source);
console.log('Applied H52 safe deck tap/drag pointer patch');
