import h129 from './worker-h129.js';

const BUILD='H130';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function stampAssets(out){
  return out.replace(/(\/style\.css)\?v=[^"']+/g,'$1?v='+BUILD)
            .replace(/(\/controls\.css)\?v=[^"']+/g,'$1?v='+BUILD)
            .replace(/(\/hand-select\.css)\?v=[^"']+/g,'$1?v='+BUILD)
            .replace(/(\/counter-ui\.css)\?v=[^"']+/g,'$1?v='+BUILD)
            .replace(/(\/board-ui\.css)\?v=[^"']+/g,'$1?v='+BUILD)
            .replace(/(\/app\.js)\?v=[^"']+/g,'$1?v='+BUILD)
            .replace(/(\/counter-ui\.js)\?v=[^"']+/g,'$1?v='+BUILD)
            .replace(/(\/hand-close\.js)\?v=[^"']+/g,'$1?v='+BUILD)
            .replace(/(\/deck-state\.js)\?v=[^"']+/g,'$1?v='+BUILD)
            .replace(/(\/ios-guard\.js)\?v=[^"']+/g,'$1?v='+BUILD);
}

function transformHtml(source){
  let out=stampAssets(source);

  /* Broad match so the visible build marker is updated even if an older worker
     changed whitespace/attributes around the span. */
  out=out.replace(/(<span\b[^>]*class=["'][^"']*\bhand-build\b[^"']*["'][^>]*>)[\s\S]*?(<\/span>)/i,'$1'+BUILD+'$2');

  if(!out.includes('h130-counter-font-parity')){
    const css=`<style id="h130-counter-font-parity">
/* Battlefield counter typography: all board views use the Full Board size. */
#field .card .badge,
#field .card .badge *,
#oppcards .card .badge,
#oppcards .card .badge *,
#fullcards .card .badge,
#fullcards .card .badge *{
  font-size:8px!important;
  line-height:1!important;
  font-weight:1000!important;
}
</style>`;
    out=out.replace('</head>',css+'</head>');
  }

  if(!out.includes('h130-live-build-guard')){
    const script=`<script id="h130-live-build-guard">(()=>{
      let current='${BUILD}';
      const apply=()=>{
        document.querySelectorAll('.hand-build').forEach(el=>{if(el.textContent!==current)el.textContent=current});
        document.documentElement.dataset.mtgBuild=current;
        window.MTG_BUILD=current;
      };
      apply();
      const root=document.getElementById('hand')||document.body;
      if(root)new MutationObserver(apply).observe(root,{childList:true,subtree:true,characterData:true});
      fetch('/api/health?from='+Date.now(),{cache:'no-store'})
        .then(r=>r.ok?r.json():null)
        .then(d=>{if(d?.build){current=String(d.build);apply()}})
        .catch(()=>{});
      window.addEventListener('pageshow',apply);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply()});
    })();</script>`;
    out=out.replace('</body>',script+'</body>');
  }
  return out;
}

async function pageDebug(request,env,ctx){
  const u=new URL(request.url);
  u.pathname='/index.html';
  u.search='?h130probe='+Date.now();
  const probeReq=new Request(u.toString(),{method:'GET',headers:request.headers});
  const upstream=await h129.fetch(probeReq,env,ctx);
  const text=await upstream.text();
  const hand=(text.match(/<span\b[^>]*class=["'][^"']*\bhand-build\b[^"']*["'][^>]*>([^<]*)<\/span>/i)||[])[1]||null;
  const asset=(text.match(/\/app\.js\?v=([^"']+)/i)||[])[1]||null;
  const data={
    ok:true,
    build:BUILD,
    upstreamStatus:upstream.status,
    upstreamHeaderBuild:upstream.headers.get('x-mtg-build'),
    handBuild:hand,
    appAssetVersion:asset,
    hasH127FontSync:text.includes('h127-counter-font-sync'),
    hasH128LiveLabel:text.includes('h128-live-build-label'),
    hasH129FontParity:text.includes('h129-counter-font-parity')
  };
  return new Response(JSON.stringify(data,null,2),{status:200,headers:headers('application/json; charset=utf-8')});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    if(url.pathname==='/api/page-debug')return pageDebug(request,env,ctx);

    const response=await h129.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
