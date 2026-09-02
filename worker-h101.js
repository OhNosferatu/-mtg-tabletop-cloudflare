import h100 from './worker-h100.js';

const BUILD='H101';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H101_FULL_BOARD_SCALE'))return source;
  let out=source;

  // Use nearly the full coordinate range inside each half so Full Board mirrors
  // the player's actual battlefield layout more closely while remaining read-only.
  out=out.replace(
    "const copy={...s,x:4+s.x*.92,y:52+s.y*.42};",
    "const copy={...s,x:2+s.x*.96,y:51+s.y*.46};"
  );
  out=out.replace(
    "const copy={...s,x:4+s.x*.92,y:3+s.y*.42};",
    "const copy={...s,x:2+s.x*.96,y:1+s.y*.46};"
  );

  const marker='\n/* H101_FULL_BOARD_SCALE */\n';
  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+marker+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source.replaceAll('H100','H101').replaceAll('h100-','h101-');
  if(out.includes('h101-fullboard-controls'))return out;

  const css=`<style id="h101-fullboard-controls">
/* Smaller Full Board cards: closer to Your Side scale. */
#fullcards .card{width:54px!important}
#fullcards .card .badge{font-size:6px!important;padding:2px 3px!important;right:1px!important;bottom:2px!important}
@media(max-width:390px){#fullcards .card{width:50px!important}}

/* Full Board alone gets collapsible Draw/Mulligan/Untap controls. */
#h101tooltoggle{display:none;width:34px;height:24px;margin:4px auto 5px;padding:0;border:1px solid #66513e;border-radius:8px;background:#211b17;color:#f1dfbd;font:900 15px/1 system-ui;place-items:center;touch-action:manipulation}
body.h101-full-mode #h101tooltoggle{display:grid}
body.h101-full-mode.h101-tools-collapsed .tools{display:none!important}
body.h101-full-mode.h101-tools-collapsed #h101tooltoggle{margin-top:4px}
</style>`;
  out=out.replace('</head>',css+'</head>');

  out=out.replace(
    '<div class="tools"><button id="draw">Draw 1</button><button id="mulligan">Mulligan</button><button id="untap">Untap All</button></div>',
    '<div class="tools"><button id="draw">Draw 1</button><button id="mulligan">Mulligan</button><button id="untap">Untap All</button></div><button id="h101tooltoggle" type="button" aria-label="Show Full Board controls" aria-expanded="false">⌄</button>'
  );

  const script=`<script id="h101-fullboard-script">window.addEventListener('DOMContentLoaded',()=>{
    const toggle=document.getElementById('h101tooltoggle');
    const setMode=(full,collapse=true)=>{
      document.body.classList.toggle('h101-full-mode',full);
      document.body.classList.toggle('h101-tools-collapsed',full&&collapse);
      if(toggle){
        const collapsed=document.body.classList.contains('h101-tools-collapsed');
        toggle.textContent=collapsed?'⌄':'⌃';
        toggle.setAttribute('aria-expanded',String(full&&!collapsed));
        toggle.setAttribute('aria-label',collapsed?'Show Full Board controls':'Hide Full Board controls');
      }
    };
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>{
      if(btn.dataset.v==='full')setMode(true,true);else setMode(false,false);
    }));
    toggle?.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      if(!document.body.classList.contains('h101-full-mode'))return;
      const collapsed=!document.body.classList.contains('h101-tools-collapsed');
      document.body.classList.toggle('h101-tools-collapsed',collapsed);
      toggle.textContent=collapsed?'⌄':'⌃';
      toggle.setAttribute('aria-expanded',String(!collapsed));
      toggle.setAttribute('aria-label',collapsed?'Show Full Board controls':'Hide Full Board controls');
    });
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h100.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
