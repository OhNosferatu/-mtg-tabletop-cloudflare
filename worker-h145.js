import h144 from './worker-h144.js';

const BUILD='H145';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h145-fixed-fullboard-tools'))return out;

  const css=`<style id="h145-fixed-fullboard-tools">
/* H145: Full Board now uses the same always-visible Draw / Mulligan / Untap All
   controls as the dedicated player board. Neutralize H101's collapsible menu
   without changing the controls themselves or any battlefield geometry. */
#h101tooltoggle{display:none!important}
body.h101-full-mode .tools,
body.h101-full-mode.h101-tools-collapsed .tools{display:flex!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h145-fixed-fullboard-tools-script">window.addEventListener('DOMContentLoaded',()=>{
    const toggle=document.getElementById('h101tooltoggle');
    if(toggle)toggle.remove();
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h144.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
