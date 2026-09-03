import h163 from './worker-h163.js';

const BUILD='H164';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h164-mana-token-system'))return out;

  const css=`<style id="h164-mana-token-system-style">
/* H164 mana inventory + battlefield tokens. */
#h162inventory .h162-inventory-body{display:block!important;text-align:left!important;color:#f4eadb!important}
#h164-mana-inventory h4{margin:0 0 9px;font-size:10px;letter-spacing:.08em;color:#d3ad70}
#h164-mana-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.h164-inv-mana{min-height:68px!important;border:1px solid #594838!important;border-radius:9px!important;background:#211b17!important;color:#f4eadb!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:5px!important;padding:6px!important;font:800 8px/1 ui-monospace,Menlo,monospace!important}
.h164-inv-mana:active{background:#30271f!important;border-color:#8b7659!important}
.h164-mana-preview,.h164-mana-token{--h164-bg:#666b70;--h164-ring:#a8adb1;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.17),transparent 30%),var(--h164-bg);border:2px solid var(--h164-ring);border-radius:50%;box-shadow:inset 0 0 0 2px rgba(0,0,0,.24),0 3px 8px #0007;color:#fff;text-shadow:0 1px 3px #000;font-weight:1000;display:grid;place-items:center}
.h164-mana-preview{width:34px;height:34px;font-size:14px}
.h164-mana-w{--h164-bg:#8f8052;--h164-ring:#ded0a2}.h164-mana-u{--h164-bg:#285f8b;--h164-ring:#69a7d5}.h164-mana-b{--h164-bg:#29262e;--h164-ring:#7d7587}.h164-mana-r{--h164-bg:#8e382f;--h164-ring:#d27668}.h164-mana-g{--h164-bg:#315e40;--h164-ring:#6fa17b}.h164-mana-c{--h164-bg:#5d6268;--h164-ring:#aeb4ba}
.h164-mana-layer{position:absolute!important;inset:0!important;z-index:19!important;pointer-events:none!important}
.h164-mana-token{position:absolute!important;width:46px!important;height:46px!important;font-size:16px!important;pointer-events:auto!important;touch-action:none!important;-webkit-touch-callout:none!important;-webkit-user-select:none!important;user-select:none!important;z-index:20!important}
.h164-mana-token.h164-moving{border-color:#f0c84b!important;box-shadow:inset 0 0 0 2px rgba(0,0,0,.24),0 0 0 3px rgba(240,200,75,.95),0 8px 16px #0009!important;z-index:10000!important}
.h164-mana-token .h164-symbol{font-size:15px;letter-spacing:.02em}
.h164-mana-token .h164-value{font-size:17px}
#h164-token-editor{display:none;position:fixed;inset:0;z-index:21000;background:#070605e8;align-items:center;justify-content:center;padding:16px}
#h164-token-editor.on{display:flex}
#h164-token-editor .h164-editor-box{width:min(92vw,330px);background:#211b17;border:1px solid #66513e;border-radius:14px;padding:14px;box-shadow:0 18px 42px #000b;text-align:center}
#h164-token-editor h3{margin:0 0 12px;font-size:13px}
#h164-editor-token{width:88px;height:88px;margin:0 auto 14px;font-size:30px}
#h164-editor-token .h164-value{font-size:30px}#h164-editor-token .h164-symbol{font-size:28px}
#h164-editor-controls{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
#h164-editor-controls button,#h164-editor-close,#h164-keypad button{min-height:42px;border:1px solid #594838;border-radius:8px;background:#30271f;color:#f4eadb;font:900 11px/1 ui-monospace,Menlo,monospace}
#h164-editor-controls button:active,#h164-editor-close:active,#h164-keypad button:active{background:#d3ad70;color:#211911}
#h164-editor-close{width:100%;margin-top:8px}
#h164-keypad-wrap{display:none;margin-top:10px;padding-top:10px;border-top:1px solid #4e4033}
#h164-keypad-wrap.on{display:block}
#h164-keypad-display{height:36px;display:grid;place-items:center;margin-bottom:7px;border:1px solid #594838;border-radius:8px;background:#14110f;color:#fff;font-size:16px;font-weight:1000}
#h164-keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
#h164-keypad .h164-key-zero{grid-column:1/3}
#h164-keypad .h164-key-close{grid-column:3}
@media(max-width:390px){#h164-mana-grid{gap:7px}.h164-inv-mana{min-height:64px!important}.h164-mana-token{width:44px!important;height:44px!important}}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const modal=`<div id="h164-token-editor" aria-hidden="true">
  <div class="h164-editor-box" role="dialog" aria-modal="true" aria-label="Mana token">
    <h3 id="h164-editor-title">Mana Token</h3>
    <div id="h164-editor-token" class="h164-mana-token h164-mana-c"><span class="h164-symbol">C</span></div>
    <div id="h164-editor-controls"><button id="h164-dec" type="button">−</button><button id="h164-keypad-open" type="button">Set</button><button id="h164-inc" type="button">+</button></div>
    <div id="h164-keypad-wrap"><div id="h164-keypad-display">0</div><div id="h164-keypad">
      <button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button>
      <button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button>
      <button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button>
      <button class="h164-key-zero" data-k="0">0</button><button class="h164-key-close" id="h164-keypad-close" type="button">Close</button>
    </div></div>
    <button id="h164-editor-close" type="button">Close</button>
  </div>
</div>`;
  out=out.replace('</body>',modal+'</body>');

  const script=`<script id="h164-mana-token-system">window.addEventListener('DOMContentLoaded',()=>{
    const inv=document.querySelector('#h162inventory .h162-inventory-body');
    if(!inv)return;
    const TYPES={
      W:{name:'White',cls:'h164-mana-w',symbol:'W'},U:{name:'Blue',cls:'h164-mana-u',symbol:'U'},B:{name:'Black',cls:'h164-mana-b',symbol:'B'},
      R:{name:'Red',cls:'h164-mana-r',symbol:'R'},G:{name:'Green',cls:'h164-mana-g',symbol:'G'},C:{name:'Colorless',cls:'h164-mana-c',symbol:'C'}
    };
    const KEY='mtg_h164_mana_tokens';
    let tokens=[];try{tokens=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(tokens))tokens=[]}catch{tokens=[]}
    const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(tokens))}catch{}};
    const get=id=>tokens.find(t=>t.id===id);
    const typeOf=t=>TYPES[t?.type]||TYPES.C;
    const tokenHtml=t=>{const n=Number(t.value)||0,ty=typeOf(t);return n>0?'<span class="h164-value">'+n+'</span>':'<span class="h164-symbol">'+ty.symbol+'</span>'};

    inv.innerHTML='<div id="h164-mana-inventory"><h4>Mana Tokens</h4><div id="h164-mana-grid"></div></div>';
    const grid=document.getElementById('h164-mana-grid');
    Object.entries(TYPES).forEach(([key,ty])=>{const b=document.createElement('button');b.type='button';b.className='h164-inv-mana';b.dataset.mana=key;b.innerHTML='<span class="h164-mana-preview '+ty.cls+'">'+ty.symbol+'</span><span>'+ty.name+'</span>';grid.appendChild(b)});

    const ensureLayers=()=>{
      const you=document.getElementById('you');if(you&&!document.getElementById('h164-mana-you')){const l=document.createElement('div');l.id='h164-mana-you';l.className='h164-mana-layer';you.appendChild(l)}
      const content=document.getElementById('h105fullcontent');if(content&&!document.getElementById('h164-mana-full')){const l=document.createElement('div');l.id='h164-mana-full';l.className='h164-mana-layer';content.appendChild(l)}
    };
    const halfRect=()=>{
      const p=document.getElementById('h116-piles-you'),content=document.getElementById('h105fullcontent');
      if(p&&content){const r=p.getBoundingClientRect();if(r.width&&r.height)return r}
      const r=content?.getBoundingClientRect();if(!r||!r.width)return null;const divider=58,h=(r.height-divider)/2;return{left:r.left,top:r.top+h+divider,width:r.width,height:h,right:r.right,bottom:r.bottom};
    };
    const makeToken=(t,mode)=>{
      const ty=typeOf(t),d=document.createElement('button');d.type='button';d.className='h164-mana-token '+ty.cls;d.dataset.h164ManaId=t.id;d.dataset.mode=mode;d.innerHTML=tokenHtml(t);d.setAttribute('aria-label',ty.name+' mana '+(Number(t.value)||0));installGesture(d,t,mode);return d;
    };
    const placeEl=(d,t,mode)=>{
      const D=46;
      if(mode==='you'){d.style.left='calc('+t.x*100+'% - '+(D*t.x)+'px)';d.style.top='calc('+t.y*100+'% - '+(D*t.y)+'px)';return}
      const content=document.getElementById('h105fullcontent'),hr=halfRect();if(!content||!hr)return;const cr=content.getBoundingClientRect();d.style.left=(hr.left-cr.left+t.x*Math.max(0,hr.width-D))+'px';d.style.top=(hr.top-cr.top+t.y*Math.max(0,hr.height-D))+'px';
    };
    const render=()=>{
      ensureLayers();
      for(const [id,mode] of [['h164-mana-you','you'],['h164-mana-full','full']]){const l=document.getElementById(id);if(!l)continue;l.innerHTML='';tokens.forEach(t=>{const d=makeToken(t,mode);placeEl(d,t,mode);l.appendChild(d)})}
    };

    const normRect=(el,boardRect)=>{
      const left=parseFloat(el.style.left||'0'),top=parseFloat(el.style.top||'0');
      const cs=getComputedStyle(el),w=parseFloat(cs.width)||91,h=parseFloat(cs.height)||127;
      if((el.style.left||'').includes('%')&&(el.style.top||'').includes('%'))return{x:left/100,y:top/100,w:w/boardRect.width,h:h/boardRect.height};
      const r=el.getBoundingClientRect();if(r.width&&r.height)return{x:(r.left-boardRect.left)/boardRect.width,y:(r.top-boardRect.top)/boardRect.height,w:r.width/boardRect.width,h:r.height/boardRect.height};
      return null;
    };
    const overlaps=(a,b)=>a.x<a.x+b.w&&a.x+a.w>b.x&&a.y<a.y+b.h&&a.y+a.h>b.y;
    const firstOpenSpot=()=>{
      const board=document.getElementById('board'),field=document.getElementById('field');const br=board?.getBoundingClientRect();if(!br||!br.width)return{x:.18,y:.03};
      const D=46,gap=8,sw=D/br.width,sh=D/br.height;
      const occupied=[];
      field?.querySelectorAll(':scope>.card').forEach(el=>{const r=normRect(el,br);if(r)occupied.push(r)});
      tokens.forEach(t=>occupied.push({x:t.x,y:t.y,w:sw,h:sh}));
      const startX=.18,startY=.03,maxX=.96-sw,maxY=.92-sh,stepX=(D+gap)/br.width,stepY=(D+gap)/br.height;
      for(let y=startY;y<=maxY+.0001;y+=stepY){for(let x=startX;x<=maxX+.0001;x+=stepX){const a={x,y,w:sw,h:sh};if(!occupied.some(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y))return{x,y}}}
      return{x:startX,y:startY};
    };
    const addMana=type=>{const p=firstOpenSpot();tokens.push({id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),type,value:0,x:p.x,y:p.y});save();render()};
    grid.addEventListener('click',e=>{const b=e.target.closest('[data-mana]');if(!b)return;addMana(b.dataset.mana)});

    let activeId=null,keyBuffer='';
    const editor=document.getElementById('h164-token-editor'),editorToken=document.getElementById('h164-editor-token'),title=document.getElementById('h164-editor-title'),keyWrap=document.getElementById('h164-keypad-wrap'),keyDisplay=document.getElementById('h164-keypad-display');
    const syncEditor=()=>{const t=get(activeId);if(!t)return;const ty=typeOf(t);editorToken.className='h164-mana-token '+ty.cls;editorToken.innerHTML=tokenHtml(t);title.textContent=ty.name+' Mana'};
    const openEditor=id=>{activeId=id;keyBuffer='';keyWrap.classList.remove('on');syncEditor();editor.classList.add('on');editor.setAttribute('aria-hidden','false')};
    const closeEditor=()=>{editor.classList.remove('on');editor.setAttribute('aria-hidden','true');keyWrap.classList.remove('on');activeId=null};
    const change=delta=>{const t=get(activeId);if(!t)return;t.value=(Number(t.value)||0)+delta;save();syncEditor();render()};
    document.getElementById('h164-inc').addEventListener('click',()=>change(1));document.getElementById('h164-dec').addEventListener('click',()=>change(-1));
    document.getElementById('h164-keypad-open').addEventListener('click',()=>{keyBuffer='';keyDisplay.textContent='0';keyWrap.classList.add('on')});
    document.getElementById('h164-keypad').addEventListener('click',e=>{const k=e.target.dataset.k;if(k===undefined)return;keyBuffer=(keyBuffer+k).replace(/^0+(?=\d)/,'').slice(0,4);keyDisplay.textContent=keyBuffer||'0'});
    document.getElementById('h164-keypad-close').addEventListener('click',()=>{const t=get(activeId);if(t&&keyBuffer!==''){t.value=parseInt(keyBuffer,10)||0;save();syncEditor();render()}keyWrap.classList.remove('on')});
    document.getElementById('h164-editor-close').addEventListener('click',closeEditor);editor.addEventListener('pointerdown',e=>{if(e.target===editor)closeEditor()});

    function installGesture(el,t,mode){
      let hold=0,armed=false,moved=false,pid=null,startX=0,startY=0;
      const clear=()=>{if(hold){clearTimeout(hold);hold=0}};
      el.onpointerdown=e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();pid=e.pointerId;startX=e.clientX;startY=e.clientY;armed=false;moved=false;try{el.setPointerCapture?.(pid)}catch{};hold=setTimeout(()=>{armed=true;el.classList.add('h164-moving')},360)};
      el.onpointermove=e=>{if(pid===null)return;if(Math.hypot(e.clientX-startX,e.clientY-startY)>5)moved=true;if(!armed)return;const D=46;
        if(mode==='you'){const r=document.getElementById('you')?.getBoundingClientRect();if(!r||!r.width)return;t.x=Math.max(0,Math.min(1,(e.clientX-r.left-D/2)/Math.max(1,r.width-D)));t.y=Math.max(0,Math.min(1,(e.clientY-r.top-D/2)/Math.max(1,r.height-D)));placeEl(el,t,'you')}
        else{const r=halfRect();if(!r||!r.width)return;t.x=Math.max(0,Math.min(1,(e.clientX-r.left-D/2)/Math.max(1,r.width-D)));t.y=Math.max(0,Math.min(1,(e.clientY-r.top-D/2)/Math.max(1,r.height-D)));placeEl(el,t,'full')}
      };
      el.onpointerup=e=>{if(pid===null)return;clear();try{el.releasePointerCapture?.(pid)}catch{};const wasArmed=armed;pid=null;armed=false;el.classList.remove('h164-moving');if(wasArmed){save();render();return}if(!moved)openEditor(t.id)};
      el.onpointercancel=()=>{clear();pid=null;armed=false;el.classList.remove('h164-moving')};el.oncontextmenu=e=>e.preventDefault();
    }

    const rerender=()=>requestAnimationFrame(render);document.querySelectorAll('[data-v]').forEach(b=>b.addEventListener('click',rerender));window.addEventListener('resize',rerender);window.addEventListener('pageshow',rerender);render();
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h163.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
