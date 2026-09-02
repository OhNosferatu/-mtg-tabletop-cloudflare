import h92 from './worker-h92.js';

const BUILD='H93';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H93_ZOOM_LAYOUT'))return source;
  let out=source;

  const helper=`function arrangeBoardZoomH93(z){
  if(!z)return;
  const controls=z.querySelector('#boardzoomcontrols');
  if(!controls)return;
  if(!document.querySelector('#h93zoomstyle')){
    const style=document.createElement('style');
    style.id='h93zoomstyle';
    style.textContent='#boardzoomcontrols{grid-template-columns:repeat(6,minmax(0,1fr))!important}#boardzoomcontrols [data-zact="tap"]{grid-column:1/3!important;grid-row:1!important}#boardzoomcontrols [data-zact="flip"]{grid-column:3/5!important;grid-row:1!important}#boardzoomcontrols [data-zact="hand"]{grid-column:5/7!important;grid-row:1!important}#boardzoomcontrols [data-zact="stats"]{grid-column:1/3!important;grid-row:2!important}#boardzoomcontrols [data-zact="counter"]{grid-column:3/5!important;grid-row:2!important}#boardzoomcontrols [data-zact="reset"]{grid-column:5/7!important;grid-row:2!important}#boardzoomcontrols.h93-has-state [data-zact="exile"]{grid-column:1/3!important;grid-row:3!important}#boardzoomcontrols.h93-has-state [data-zact="discard"]{grid-column:3/5!important;grid-row:3!important}#boardzoomcontrols.h93-has-state [data-zact="state"]{grid-column:5/7!important;grid-row:3!important}#boardzoomcontrols:not(.h93-has-state) [data-zact="exile"]{grid-column:2/4!important;grid-row:3!important}#boardzoomcontrols:not(.h93-has-state) [data-zact="discard"]{grid-column:4/6!important;grid-row:3!important}#boardzoomcontrols:not(.h93-has-state) [data-zact="state"]{display:none!important}.zreset>span{font-size:7px!important;line-height:1.05!important;white-space:normal!important;padding:4px 2px!important}.zreset>span small{display:none!important}';
    document.head.appendChild(style);
  }
  const reset=controls.querySelector('[data-zact="reset"]');
  if(reset)reset.innerHTML='<span>Reset X/X</span><span>Reset 1/1</span>';
}/* H93_ZOOM_LAYOUT */\n`;

  out=out.replace('async function openBoardZoom(c){',helper+'async function openBoardZoom(c){');
  out=out.replace('arrangeBoardZoomH92(z);const img=z.querySelector(\'img\');','arrangeBoardZoomH92(z);arrangeBoardZoomH93(z);const img=z.querySelector(\'img\');');

  out=out.replace(
    "const state=z.querySelector('[data-zact=\"state\"]');if(state)state.hidden=!(c.isDoubleFaced&&c.faces.length>1);",
    "const state=z.querySelector('[data-zact=\"state\"]');const hasState=!!(c.isDoubleFaced&&c.faces.length>1);if(state)state.hidden=!hasState;const zoomControls=z.querySelector('#boardzoomcontrols');if(zoomControls)zoomControls.classList.toggle('h93-has-state',hasState);"
  );

  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h92.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H92','H93').replaceAll('h92-','h93-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
