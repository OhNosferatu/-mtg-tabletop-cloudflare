import h169 from './worker-h169.js';

const BUILD='H170';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h170-mana-half-geometry'))return out;

  /* H168 was reading #h116-piles-you first. In Full Board that layer belongs to
     the combined two-board canvas, so its client rect can resolve to the wrong
     half. Cards do not use that rect: the player board is exactly the lower
     normal-height half after the fixed 58px H133 divider. Make inventory tokens
     use that same exact geometry for rendering and dragging. */
  out=out.replace(
`const halfRect=()=>{
      const p=document.getElementById('h116-piles-you'),content=document.getElementById('h105fullcontent');
      if(p&&content){const r=p.getBoundingClientRect();if(r.width&&r.height)return r}
      const r=content?.getBoundingClientRect();if(!r||!r.width)return null;const divider=58,h=(r.height-divider)/2;return{left:r.left,top:r.top+h+divider,width:r.width,height:h,right:r.right,bottom:r.bottom};
    };`,
`const halfRect=()=>{
      const content=document.getElementById('h105fullcontent');
      const r=content?.getBoundingClientRect();if(!r||!r.width||!r.height)return null;
      const divider=58,h=(r.height-divider)/2,top=r.top+h+divider;
      return{left:r.left,top,width:r.width,height:h,right:r.right,bottom:top+h};
    };`
  );

  const css=`<style id="h170-mana-half-geometry">
/* Geometry only; tokens remain independent movable objects above battlefield cards. */
#h164-mana-full{pointer-events:none!important}
#h164-mana-full .h164-mana-token{pointer-events:auto!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h170-mana-half-geometry-script">window.addEventListener('DOMContentLoaded',()=>{
    const sync=()=>requestAnimationFrame(()=>window.MTG_H168_manaLifecycle?.render?.());
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',sync));
    window.addEventListener('resize',sync,{passive:true});
    window.addEventListener('pageshow',sync);
    sync();
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h169.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
