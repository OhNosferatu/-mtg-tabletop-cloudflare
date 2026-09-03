import h183 from './worker-h183.js';

const BUILD='H184';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h184-fixed-action-row'))return out;

  const css=`<style id="h184-fixed-action-row">
/* H184: keep the action row permanently mounted immediately above the board.
   This does not change Full Board geometry; it only prevents legacy state changes
   (including Mulligan) from hiding or collapsing the controls. */
body>.tools{
  display:grid!important;
  visibility:visible!important;
  opacity:1!important;
  position:relative!important;
  inset:auto!important;
  z-index:70!important;
  width:100%!important;
  height:44px!important;
  min-height:44px!important;
  max-height:44px!important;
  margin:5px 0!important;
  overflow:visible!important;
  transform:none!important;
  pointer-events:auto!important;
}
body>.tools>#draw,
body>.tools>#mulligan,
body>.tools>#untap,
body>.tools>#h161-menu-host{
  visibility:visible!important;
  opacity:1!important;
  pointer-events:auto!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h184-fixed-action-row-script">window.addEventListener('DOMContentLoaded',()=>{
    const tools=document.querySelector('body>.tools');
    if(!tools)return;
    const pin=()=>{
      tools.style.setProperty('display','grid','important');
      tools.style.setProperty('visibility','visible','important');
      tools.style.setProperty('opacity','1','important');
      tools.style.setProperty('position','relative','important');
      tools.style.setProperty('height','44px','important');
      tools.style.setProperty('min-height','44px','important');
      tools.style.setProperty('max-height','44px','important');
      tools.style.setProperty('margin','5px 0','important');
      tools.style.setProperty('transform','none','important');
      tools.style.setProperty('pointer-events','auto','important');
    };
    pin();
    new MutationObserver(pin).observe(tools,{attributes:true,attributeFilter:['class','style','hidden']});
    document.getElementById('mulligan')?.addEventListener('click',()=>{
      requestAnimationFrame(pin);setTimeout(pin,30);setTimeout(pin,120);
    });
    window.addEventListener('pageshow',pin);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h183.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
