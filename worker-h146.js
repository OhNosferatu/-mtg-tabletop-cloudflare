import h145 from './worker-h145.js';

const BUILD='H146';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h146-fixed-full-tools-empty-deck'))return out;

  const css=`<style id="h146-fixed-full-tools-empty-deck">
/* Full Board should use the exact same always-visible action strip as Your Side.
   H101 may still add its old collapsed body class, so override it decisively. */
#h101tooltoggle{display:none!important}
body.h101-full-mode .tools,
body.h101-full-mode.h101-tools-collapsed .tools{
  display:flex!important;
  visibility:visible!important;
  opacity:1!important;
}

/* Empty deck slots must remain visually empty. The Full Board pile layer clones
   the Your Side deck zone, so cover both a pseudo-element card back and any
   accidentally cloned image while the zone carries the empty class. */
#you .deck.empty::before,
#h116-piles-you .deck.empty::before,
#h116-piles-you .h116-deck.empty::before{
  display:none!important;
  content:none!important;
  background:none!important;
}
#you .deck.empty>img,
#h116-piles-you .deck.empty>img,
#h116-piles-you .h116-deck.empty>img{display:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h146-fixed-full-tools-empty-deck-script">window.addEventListener('DOMContentLoaded',()=>{
    const tools=document.querySelector('.tools');
    const toggle=document.getElementById('h101tooltoggle');
    toggle?.remove();

    const enforce=()=>{
      const full=document.getElementById('full');
      const fullOn=!!full?.classList.contains('on')||document.body.classList.contains('h101-full-mode');
      if(fullOn){
        document.body.classList.remove('h101-tools-collapsed');
        tools?.style.setProperty('display','flex','important');
      }else if(tools){
        tools.style.removeProperty('display');
      }
    };

    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(enforce,0)));
    window.addEventListener('pageshow',enforce);
    enforce();
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h145.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
