import h142 from './worker-h142.js';

const BUILD='H143';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h143-turn-button-colors'))return out;

  const css=`<style id="h143-turn-button-colors">
/* H143: make the existing turn switch itself carry the active player's color.
   The divider already owns data-turn="you|opp", so this is visual-only and
   does not alter turn logic, timer behavior, geometry, or interactions. */
#h105divider #h134-turn-switch{
  transition:background .16s ease,border-color .16s ease,box-shadow .16s ease,color .16s ease!important;
}
#h105divider[data-turn="you"] #h134-turn-switch{
  background:linear-gradient(180deg,#326fc4,#23518f)!important;
  border-color:#79aef2!important;
  color:#fff!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 0 1px rgba(63,141,255,.18),0 2px 6px #0008!important;
}
#h105divider[data-turn="opp"] #h134-turn-switch{
  background:linear-gradient(180deg,#b84444,#7f2f2f)!important;
  border-color:#ef8585!important;
  color:#fff!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 0 0 1px rgba(220,65,65,.18),0 2px 6px #0008!important;
}
#h105divider[data-turn="you"] #h134-turn-switch .h134-turn-label,
#h105divider[data-turn="opp"] #h134-turn-switch .h134-turn-label{
  color:#fff!important;
  text-shadow:0 1px 2px rgba(0,0,0,.72)!important;
}
#h105divider[data-turn="you"] #h134-turn-switch .h134-swap,
#h105divider[data-turn="opp"] #h134-turn-switch .h134-swap{
  color:#fff!important;
  text-shadow:0 1px 2px rgba(0,0,0,.72)!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h142.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
