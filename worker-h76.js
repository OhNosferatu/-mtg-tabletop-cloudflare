import h75 from './worker-h75.js';

const BUILD='H76';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('function ensureTokenZoom()'))return source;
  const marker='function zoneDrag(';
  if(!source.includes(marker))return source;

  const helper=`let tokenZoomCard=null;
function tokenZoomStatText(c){
  if(!c)return '';
  const lines=[];
  if(c.p1)lines.push('Counter: '+(c.p1>0?'+':'')+c.p1+'/'+(c.p1>0?'+':'')+c.p1);
  if(c.p!==null||c.t!==null)lines.push('Base P/T: '+(c.p??0)+'/'+(c.t??0));
  return lines.join(' · ')||'No counters';
}
function ensureTokenZoom(){
  let z=$('#tokenzoom');if(z)return z;
  const style=document.createElement('style');
  style.textContent='#tokenzoom{display:none;position:fixed;inset:0;z-index:33000;background:rgba(5,5,5,.72);align-items:center;justify-content:center;padding:max(62px,env(safe-area-inset-top)) 12px max(232px,env(safe-area-inset-bottom));touch-action:manipulation}#tokenzoom.on{display:flex}#tokenzoomcard{display:flex;flex-direction:column;align-items:center;justify-content:center;max-width:min(76vw,360px);max-height:calc(100dvh - 350px)}#tokenzoomcard img{display:block;max-width:min(76vw,360px);max-height:calc(100dvh - 350px);width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 12px 36px #000}#tokenzoomname{display:none;max-width:76vw;padding:26px 18px;border:1px solid #806a50;border-radius:12px;background:#211b17;color:#fff;text-align:center;font:900 16px/1.3 ui-monospace,Menlo,monospace}#tokenzoomclose{position:fixed;right:14px;top:max(14px,env(safe-area-inset-top));z-index:33003;width:46px;height:46px;border:1px solid #8b7659;border-radius:50%;background:#211b17;color:#fff;font:700 30px/1 system-ui;display:grid;place-items:center;padding:0;touch-action:manipulation}#tokenzoomstats{position:fixed;left:12px;right:72px;top:max(18px,env(safe-area-inset-top));z-index:33002;color:#f0dcb7;font:900 11px/1.2 ui-monospace,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tokenzoomcontrols{position:fixed;left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom));z-index:33002;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:8px;border:1px solid #5d4b39;border-radius:12px;background:#18130ff2;box-shadow:0 -8px 24px #0008}#tokenzoomcontrols button{min-height:38px;border:1px solid #806a50;border-radius:8px;background:#2b231c;color:#f5ead8;font:800 8px/1.1 ui-monospace,Menlo,monospace;padding:5px 3px;touch-action:manipulation}#tokenzoomcontrols .danger{border-color:#7f4c45}@media(max-width:390px){#tokenzoom{padding-bottom:max(226px,env(safe-area-inset-bottom))}#tokenzoomcard,#tokenzoomcard img{max-height:calc(100dvh - 340px)}#tokenzoomcontrols button{min-height:36px;font-size:7px}}';
  document.head.appendChild(style);
  z=document.createElement('div');z.id='tokenzoom';
  z.innerHTML='<button id="tokenzoomclose" aria-label="Close token">×</button><div id="tokenzoomstats">No counters</div><div id="tokenzoomcard"><img alt="Token preview" decoding="async"><div id="tokenzoomname"></div></div><div id="tokenzoomcontrols"><button data-tz="tap">Tap</button><button data-tz="flip">Face Down</button><button data-tz="state">Other Side</button><button data-tz="p1plus">+1/+1</button><button data-tz="p1minus">−1/−1</button><button data-tz="battlefield">Battlefield</button><button data-tz="pplus">P +</button><button data-tz="pminus">P −</button><button data-tz="tplus">T +</button><button data-tz="tminus">T −</button><button data-tz="hand">To Hand</button><button data-tz="discard" class="danger">Graveyard</button><button data-tz="exile">Exile</button></div>';
  document.body.appendChild(z);
  z.addEventListener('click',e=>{
    if(e.target===z||e.target.closest?.('#tokenzoomclose')){closeTokenZoom(true);return}
    const b=e.target.closest?.('button[data-tz]'),c=tokenZoomCard;if(!b||!c)return;
    e.preventDefault();e.stopPropagation();
    const a=b.dataset.tz;
    if(a==='tap'){c.tap=!c.tap;refreshTokenZoom();return}
    if(a==='flip'){c.faceDown=!c.faceDown;refreshTokenZoom();return}
    if(a==='state'){if(c.isDoubleFaced&&c.faces?.length>1){c.stateIndex=(c.stateIndex+1)%c.faces.length;refreshTokenZoom()}return}
    if(a==='p1plus'){c.p1=(c.p1||0)+1;refreshTokenZoom();return}
    if(a==='p1minus'){c.p1=(c.p1||0)-1;refreshTokenZoom();return}
    if(a==='pplus'||a==='pminus'||a==='tplus'||a==='tminus'){
      if(c.p===null)c.p=0;if(c.t===null)c.t=0;
      if(a==='pplus')c.p++;else if(a==='pminus')c.p--;else if(a==='tplus')c.t++;else c.t--;
      refreshTokenZoom();return
    }
    if(a==='battlefield'){
      const r=fieldRect();placeOnField(c.id,r.left+r.width*.5,r.top+r.height*.5,false);closeTokenZoom(false);render();return
    }
    if(a==='hand'||a==='discard'||a==='exile'){
      const zone=a==='hand'?'hand':a;putInZone(c.id,zone);revealForZone(c,zone);closeTokenZoom(false);render();return
    }
  });
  return z;
}
function refreshTokenZoom(){
  const z=$('#tokenzoom'),c=tokenZoomCard;if(!z||!c)return;
  const img=z.querySelector('img'),name=z.querySelector('#tokenzoomname'),src=displayImage(c)||'';
  if(src){img.style.display='block';if(img.getAttribute('src')!==src)img.src=src;name.style.display='none'}else{img.removeAttribute('src');img.style.display='none';name.textContent=c.name||'Token';name.style.display='block'}
  z.querySelector('#tokenzoomstats').textContent=tokenZoomStatText(c);
  const tap=z.querySelector('[data-tz="tap"]');if(tap)tap.textContent=c.tap?'Untap':'Tap';
  const flip=z.querySelector('[data-tz="flip"]');if(flip)flip.textContent=c.faceDown?'Face Up':'Face Down';
  const state=z.querySelector('[data-tz="state"]');if(state)state.hidden=!(c.isDoubleFaced&&c.faces?.length>1);
}
function closeTokenZoom(renderAfter=false){
  const z=$('#tokenzoom');if(z){z.classList.remove('on');const img=z.querySelector('img');if(img)img.removeAttribute('src')}
  tokenZoomCard=null;if(renderAfter)render();
}
function openTokenZoom(c){
  if(!c)return;const z=ensureTokenZoom();tokenZoomCard=c;z.classList.add('on');refreshTokenZoom();
}
`;

  let out=source.replace(marker,helper+'\n'+marker);
  out=out.replace(
`    if(!moved){
      if(from==='deck'){openDeckOptions();return}
      openCard(c,true);
      return;
    }`,
`    if(!moved){
      if(from==='deck'){openDeckOptions();return}
      if(from==='tokens'){openTokenZoom(c);return}
      openCard(c,true);
      return;
    }`
  );
  out=out.replace(
    "async function openBoardZoom(c){if(!c)return;const z=ensureBoardZoom()",
    "async function openBoardZoom(c){if(!c)return;if(c.meta?.token){openTokenZoom(c);return}const z=ensureBoardZoom()"
  );
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h75.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      const out=text.replaceAll('H75','H76').replaceAll('h75-','h76-');
      return new Response(out,{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
