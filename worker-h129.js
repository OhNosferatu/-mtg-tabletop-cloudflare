import h128 from './worker-h128.js';

const BUILD='H129';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source;
  if(out.includes('h129-counter-font-parity'))return out;

  /* Force a fresh load of the browser assets. Previous HTML kept the original
     20260831-32 query string, which lets iOS Safari reuse older CSS/JS even
     while /api/health is already on a newer worker. */
  out=out.replace(/(\/style\.css)\?v=[^"']+/g,'$1?v='+BUILD)
         .replace(/(\/controls\.css)\?v=[^"']+/g,'$1?v='+BUILD)
         .replace(/(\/hand-select\.css)\?v=[^"']+/g,'$1?v='+BUILD)
         .replace(/(\/counter-ui\.css)\?v=[^"']+/g,'$1?v='+BUILD)
         .replace(/(\/board-ui\.css)\?v=[^"']+/g,'$1?v='+BUILD)
         .replace(/(\/app\.js)\?v=[^"']+/g,'$1?v='+BUILD)
         .replace(/(\/counter-ui\.js)\?v=[^"']+/g,'$1?v='+BUILD)
         .replace(/(\/hand-close\.js)\?v=[^"']+/g,'$1?v='+BUILD)
         .replace(/(\/deck-state\.js)\?v=[^"']+/g,'$1?v='+BUILD)
         .replace(/(\/ios-guard\.js)\?v=[^"']+/g,'$1?v='+BUILD);

  /* The H28/H45 stylesheet still contains an old #field 5px override for
     counter-stack badges. Cover both old and new badge classes so Your Side,
     Opponent and Full Board all use the same typography regardless of which
     counter-ui.js version created a particular badge. */
  const css=`<style id="h129-counter-font-parity">
#field .card .badge.counter-total,
#field .card .badge.counter-stack,
#oppcards .card .badge.counter-total,
#oppcards .card .badge.counter-stack,
#fullcards .card .badge.counter-total,
#fullcards .card .badge.counter-stack{
  font-size:8px!important;
  line-height:1!important;
  font-weight:1000!important;
}
#field .card .badge.counter-total *,
#field .card .badge.counter-stack *,
#oppcards .card .badge.counter-total *,
#oppcards .card .badge.counter-stack *,
#fullcards .card .badge.counter-total *,
#fullcards .card .badge.counter-stack *{
  font-size:8px!important;
  line-height:1!important;
  font-weight:1000!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  /* Update the visible build marker server-side as well as at runtime. */
  out=out.replace(/(<span class="hand-build">)[^<]*(<\/span>)/,'$1'+BUILD+'$2');
  const script=`<script id="h129-live-build-label">(()=>{
    const apply=build=>{if(!build)return;document.querySelectorAll('.hand-build').forEach(el=>el.textContent=String(build));document.documentElement.dataset.mtgBuild=String(build);window.MTG_BUILD=String(build)};
    apply('${BUILD}');
    fetch('/api/health?from='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>apply(d?.build)).catch(()=>{});
  })();</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h128.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
