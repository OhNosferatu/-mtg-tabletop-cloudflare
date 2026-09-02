import h91 from './worker-h91.js';

const BUILD='H92';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H92_ZOOM_LAYOUT'))return source;
  let out=source;

  const helper=`function arrangeBoardZoomH92(z){
  if(!z)return;
  let controls=z.querySelector('#boardzoomcontrols');
  if(!controls)return;
  if(!document.querySelector('#h92zoomstyle')){
    const style=document.createElement('style');
    style.id='h92zoomstyle';
    style.textContent='#boardzoomcontrols [data-zact="tap"]{grid-column:1;grid-row:1}#boardzoomcontrols [data-zact="flip"]{grid-column:2;grid-row:1}#boardzoomcontrols [data-zact="counter"]{grid-column:3;grid-row:1}#boardzoomcontrols [data-zact="stats"]{grid-column:1;grid-row:2}#boardzoomcontrols [data-zact="hand"]{grid-column:2;grid-row:2}#boardzoomcontrols [data-zact="reset"]{grid-column:3;grid-row:2}#boardzoomcontrols [data-zact="exile"]{grid-column:1;grid-row:3}#boardzoomcontrols [data-zact="discard"]{grid-column:2;grid-row:3}#boardzoomcontrols [data-zact="state"]{grid-column:3;grid-row:3}.zreset>span{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:8px!important;line-height:1!important}.zreset>span small{font-size:6px;opacity:.65;letter-spacing:.04em}.zstats>span{font-size:12px!important;font-weight:900!important}.zstats>span:after{content:none!important}';
    document.head.appendChild(style);
  }
  if(!controls.querySelector('[data-zact="reset"]')){
    const reset=document.createElement('button');
    reset.dataset.zact='reset';
    reset.className='zsplit zreset';
    reset.innerHTML='<span>X/X<small>RESET</small></span><span>±1/±1<small>RESET</small></span>';
    reset.setAttribute('aria-label','Reset X/X or plus/minus one counters');
    controls.appendChild(reset);
  }
  z.dataset.h92='1';
}/* H92_ZOOM_LAYOUT */\n`;

  out=out.replace('async function openBoardZoom(c){',helper+'async function openBoardZoom(c){');
  out=out.replace(
    "async function openBoardZoom(c){if(!c)return;const z=ensureBoardZoom(),img=z.querySelector('img');",
    "async function openBoardZoom(c){if(!c)return;const z=ensureBoardZoom();arrangeBoardZoomH92(z);const img=z.querySelector('img');"
  );

  out=out.replace(
    "if(a==='counter'){const r=b.getBoundingClientRect();c.p1=(c.p1||0)+(e.clientX<r.left+r.width/2?1:-1);syncStatVisual(c);refreshBoardZoom();return}if(a==='hand'||a==='discard'||a==='exile')",
    "if(a==='counter'){const r=b.getBoundingClientRect();c.p1=(c.p1||0)+(e.clientX<r.left+r.width/2?1:-1);syncStatVisual(c);refreshBoardZoom();return}if(a==='reset'){const r=b.getBoundingClientRect();if(e.clientX<r.left+r.width/2){c.p=null;c.t=null}else c.p1=0;syncStatVisual(c);refreshBoardZoom();return}if(a==='hand'||a==='discard'||a==='exile')"
  );

  out=out.replace(
    "const stats=z.querySelector('[data-zact=\"stats\"]');if(stats){const active=c.p!==null||c.t!==null;stats.classList.toggle('active',active);stats.innerHTML=active?'<span>'+(c.p??0)+'</span><span>'+(c.t??0)+'</span>':'<span>X/X</span>'}",
    "const stats=z.querySelector('[data-zact=\"stats\"]');if(stats){stats.classList.remove('active');stats.innerHTML='<span>X/X</span>'}"
  );

  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h91.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H91','H92').replaceAll('h91-','h92-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
