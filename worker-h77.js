import h71 from './worker-h71.js';

const BUILD='H77';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

async function scryfallCollection(ids){
  if(!ids.length)return[];
  const out=[];
  for(let i=0;i<ids.length;i+=75){
    const batch=ids.slice(i,i+75);
    try{
      const r=await fetch('https://api.scryfall.com/cards/collection',{
        method:'POST',
        headers:{'content-type':'application/json','accept':'application/json','user-agent':'MTGTabletop/1.0 (Cloudflare Worker)'},
        body:JSON.stringify({identifiers:batch.map(id=>({id}))})
      });
      if(r.ok){const d=await r.json();if(Array.isArray(d.data))out.push(...d.data)}
    }catch{}
  }
  return out;
}

async function hydrateTokenImport(request,env,ctx){
  const base=await h71.fetch(request,env,ctx);
  if(!base.ok)return base;
  let deck;
  try{deck=await base.clone().json()}catch{return base}
  if(!deck||!Array.isArray(deck.tokens)||!deck.tokens.length)return base;

  const ids=[...new Set(deck.tokens.map(t=>String(t?.scryfallId||'')).filter(id=>/^[0-9a-f-]{36}$/i.test(id)))];
  const cards=await scryfallCollection(ids);
  const byId=new Map(cards.map(c=>[c.id,c]));

  deck.tokens=deck.tokens.map(token=>{
    const card=byId.get(String(token?.scryfallId||''));
    if(!card)return token;
    const faces=(card.card_faces||[]).map(f=>({name:f.name||card.name||token.name,image:f.image_uris?.normal||''})).filter(f=>f.image);
    const image=card.image_uris?.normal||faces[0]?.image||'';
    const doubleFacedLayouts=new Set(['transform','modal_dfc','double_faced_token','reversible_card']);
    return {...token,image,faces:faces.length?faces:[{name:card.name||token.name,image}],isDoubleFaced:doubleFacedLayouts.has(card.layout)&&faces.length>1};
  });

  return new Response(JSON.stringify(deck),{status:base.status,headers:headers('application/json; charset=utf-8')});
}

function transformApp(source){
  let out=source;

  // Hydrate imported token objects directly into card state so opening the
  // Tokens pile never needs a card lookup or render-time preload.
  out=out.replace(
    "function expand(items,z){const out=[];(items||[]).forEach(x=>{const q=typeof x==='string'?1:+x.quantity||1,n=typeof x==='string'?x:x.name;for(let i=0;i<q;i++)out.push(make(n,z,typeof x==='string'?{}:x))});return out}",
    "function expand(items,z){const out=[];(items||[]).forEach(x=>{const q=typeof x==='string'?1:+x.quantity||1,n=typeof x==='string'?x:x.name;for(let i=0;i<q;i++){const id=make(n,z,typeof x==='string'?{}:x),c=st.cards[id];if(x&&typeof x==='object'&&x.image){c.img=x.image;c.faces=Array.isArray(x.faces)&&x.faces.length?x.faces:[{name:n,image:x.image}];c.isDoubleFaced=!!x.isDoubleFaced&&c.faces.length>1}out.push(id)}});return out}"
  );
  out=out.replace(
    "[...st.cmd.slice(0,2),st.side[0],...st.tokens.slice(0,4)].filter(Boolean).forEach(id=>load(st.cards[id]).then(render));render()",
    "[...st.cmd.slice(0,2),st.side[0]].filter(Boolean).forEach(id=>load(st.cards[id]).then(render));render()"
  );

  const marker='function zoneDrag(';
  if(!out.includes(marker)||out.includes('function ensureSafeTokenZoom()'))return out;

  const helper=`let safeTokenZoomCard=null,safeTokenStatTimer=null,safeTokenStatHeld=false,safeTokenStatActivated=false,safeTokenStatSide='p';
function safeTokenStatText(c){
  if(!c)return '';
  const bits=[];
  if(c.p1)bits.push((c.p1>0?'+':'')+c.p1+'/'+(c.p1>0?'+':'')+c.p1);
  if(c.p!==null||c.t!==null)bits.push((c.p??0)+'/'+(c.t??0));
  return bits.join(' · ')||'No counters';
}
function ensureSafeTokenZoom(){
  let z=$('#safetokenzoom');if(z)return z;
  const style=document.createElement('style');
  style.textContent='#safetokenzoom{display:none;position:fixed;inset:0;z-index:33000;background:rgba(5,5,5,.62);align-items:center;justify-content:center;padding:max(62px,env(safe-area-inset-top)) 12px max(196px,env(safe-area-inset-bottom));touch-action:manipulation}#safetokenzoom.on{display:flex}#safetokenzoomcard{position:relative;display:flex;align-items:center;justify-content:center;width:max-content;max-width:min(76vw,360px);max-height:calc(100dvh - 310px)}#safetokenzoomcard img{display:block;max-width:min(76vw,360px);max-height:calc(100dvh - 310px);width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 12px 36px #000}#safetokenzoomname{display:none;max-width:76vw;padding:26px 18px;border:1px solid #806a50;border-radius:12px;background:#211b17;color:#fff;text-align:center;font:900 16px/1.3 ui-monospace,Menlo,monospace}#safetokenzoomclose{position:fixed;right:14px;top:max(14px,env(safe-area-inset-top));z-index:33003;width:46px;height:46px;border:1px solid #8b7659;border-radius:50%;background:#211b17;color:#fff;font:700 30px/1 system-ui;display:grid;place-items:center;padding:0;touch-action:manipulation}#safetokenzoomstats{position:absolute;right:5%;bottom:7.5%;z-index:4;min-width:58px;max-width:58%;padding:6px 8px;border:1px solid #eedca8;border-radius:8px;background:rgba(18,14,12,.88);color:#fff;font:900 12px/1.05 ui-monospace,Menlo,monospace;text-align:center;white-space:pre-line;box-shadow:0 2px 8px #0009}#safetokenzoomstats[hidden]{display:none!important}#safetokenzoomcontrols{position:fixed;left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom));z-index:33002;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:8px;border:1px solid #5d4b39;border-radius:12px;background:#18130ff2;box-shadow:0 -8px 24px #0008}#safetokenzoomcontrols button{min-height:42px;border:1px solid #806a50;border-radius:8px;background:#2b231c;color:#f5ead8;font:800 9px/1.1 ui-monospace,Menlo,monospace;padding:6px 4px;touch-action:manipulation}#safetokenzoomcontrols .danger{border-color:#7f4c45}.stzsplit{display:flex!important;align-items:stretch!important;padding:0!important;overflow:hidden}.stzsplit>span{flex:1;display:grid;place-items:center;min-width:0;padding:6px 2px}.stzsplit>span+span{border-left:1px solid #806a50}.stzstats.active>span{font-size:15px;font-weight:900}@media(max-width:390px){#safetokenzoom{padding-bottom:max(194px,env(safe-area-inset-bottom))}#safetokenzoomcard,#safetokenzoomcard img{max-height:calc(100dvh - 300px)}#safetokenzoomcontrols{gap:5px}#safetokenzoomcontrols button{min-height:40px;font-size:8px}}';
  document.head.appendChild(style);
  z=document.createElement('div');z.id='safetokenzoom';
  z.innerHTML='<button id="safetokenzoomclose" aria-label="Close token">×</button><div id="safetokenzoomcard"><img alt="Token preview" decoding="async"><div id="safetokenzoomname"></div><div id="safetokenzoomstats" hidden></div></div><div id="safetokenzoomcontrols"><button data-stz="tap">Tap</button><button data-stz="flip">Flip</button><button data-stz="state">Other Side</button><button data-stz="counter" class="stzsplit"><span>+1/+1</span><span>−1/−1</span></button><button data-stz="stats" class="stzsplit stzstats"><span>X/X</span></button><button data-stz="hand">To Hand</button><button data-stz="discard" class="danger">Discard</button><button data-stz="exile">Exile</button></div>';
  document.body.appendChild(z);

  z.addEventListener('pointerdown',e=>{
    const b=e.target.closest?.('button[data-stz="stats"]'),c=safeTokenZoomCard;if(!b||!c)return;
    e.preventDefault();e.stopPropagation();clearTimeout(safeTokenStatTimer);safeTokenStatHeld=false;safeTokenStatActivated=false;
    if(c.p===null&&c.t===null){c.p=0;c.t=0;safeTokenStatActivated=true;refreshSafeTokenZoom();return}
    const r=b.getBoundingClientRect();safeTokenStatSide=e.clientX<r.left+r.width/2?'p':'t';
    safeTokenStatTimer=setTimeout(()=>{if(safeTokenZoomCard!==c)return;c[safeTokenStatSide]=(c[safeTokenStatSide]??0)-1;safeTokenStatHeld=true;refreshSafeTokenZoom()},500);
  },true);
  z.addEventListener('pointerup',e=>{
    const b=e.target.closest?.('button[data-stz="stats"]'),c=safeTokenZoomCard;if(!b||!c)return;
    e.preventDefault();e.stopPropagation();clearTimeout(safeTokenStatTimer);safeTokenStatTimer=null;
    if(safeTokenStatActivated){safeTokenStatActivated=false;safeTokenStatHeld=false;return}
    if(!safeTokenStatHeld){c[safeTokenStatSide]=(c[safeTokenStatSide]??0)+1;refreshSafeTokenZoom()}
    safeTokenStatHeld=false;
  },true);
  z.addEventListener('pointercancel',()=>{clearTimeout(safeTokenStatTimer);safeTokenStatTimer=null;safeTokenStatHeld=false;safeTokenStatActivated=false},true);

  z.addEventListener('click',e=>{
    if(e.target===z||e.target.closest?.('#safetokenzoomclose')){closeSafeTokenZoom();return}
    const b=e.target.closest?.('button[data-stz]'),c=safeTokenZoomCard;if(!b||!c)return;
    e.preventDefault();e.stopPropagation();const a=b.dataset.stz;
    if(a==='stats')return;
    if(a==='tap'){c.tap=!c.tap;refreshSafeTokenZoom();return}
    if(a==='flip'){c.faceDown=!c.faceDown;refreshSafeTokenZoom();return}
    if(a==='state'){if(c.isDoubleFaced&&c.faces?.length>1){c.stateIndex=(c.stateIndex+1)%c.faces.length;refreshSafeTokenZoom()}return}
    if(a==='counter'){const r=b.getBoundingClientRect();c.p1=(c.p1||0)+(e.clientX<r.left+r.width/2?1:-1);refreshSafeTokenZoom();return}
    if(a==='hand'||a==='discard'||a==='exile'){
      const zone=a==='hand'?'hand':a;putInZone(c.id,zone);revealForZone(c,zone);closeSafeTokenZoom();requestAnimationFrame(()=>render());return
    }
  });
  return z;
}
function refreshSafeTokenZoom(){
  const z=$('#safetokenzoom'),c=safeTokenZoomCard;if(!z||!c)return;
  const img=z.querySelector('img'),name=z.querySelector('#safetokenzoomname'),src=displayImage(c)||'';
  if(src){img.style.display='block';if(img.getAttribute('src')!==src)img.src=src;name.style.display='none'}else{img.removeAttribute('src');img.style.display='none';name.textContent=c.name||'Token';name.style.display='block'}
  const text=safeTokenStatText(c),stat=z.querySelector('#safetokenzoomstats');stat.textContent=text;stat.hidden=text==='No counters';
  const tap=z.querySelector('[data-stz="tap"]');if(tap)tap.textContent=c.tap?'Untap':'Tap';
  const state=z.querySelector('[data-stz="state"]');if(state)state.hidden=!(c.isDoubleFaced&&c.faces?.length>1);
  const stats=z.querySelector('[data-stz="stats"]');if(stats){const active=c.p!==null||c.t!==null;stats.classList.toggle('active',active);stats.innerHTML=active?'<span>'+(c.p??0)+'</span><span>'+(c.t??0)+'</span>':'<span>X/X</span>'}
}
function closeSafeTokenZoom(){
  clearTimeout(safeTokenStatTimer);safeTokenStatTimer=null;safeTokenStatHeld=false;safeTokenStatActivated=false;
  const z=$('#safetokenzoom');if(z){z.classList.remove('on');z.querySelector('img')?.removeAttribute('src')}
  safeTokenZoomCard=null;
}
function openSafeTokenZoom(c){
  if(!c)return;const z=ensureSafeTokenZoom();safeTokenZoomCard=c;z.classList.add('on');refreshSafeTokenZoom();
}
`;

  out=out.replace(marker,helper+'\n'+marker);
  out=out.replace(
    "if(!moved){if(from==='deck'){openDeckOptions();return}openCard(c,true);return}",
    "if(!moved){if(from==='deck'){openDeckOptions();return}if(from==='tokens'){openSafeTokenZoom(c);return}openCard(c,true);return}"
  );
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    if(url.pathname==='/api/import-archidekt'&&request.method==='POST')return hydrateTokenImport(request,env,ctx);

    const response=await h71.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      const out=text.replaceAll('H71','H77').replaceAll('h71-','h77-');
      return new Response(out,{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
