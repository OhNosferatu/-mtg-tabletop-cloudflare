import h160 from './worker-h160.js';

const BUILD='H161';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h161-top-inventory-menu'))return out;

  const css=`<style id="h161-top-inventory-menu">
/* H161 top controls:
   row 1 = Your Side | Full Board | Opponent
   row 2 = Draw 1 | Mulligan | Untap All | dropdown */
.bar{height:54px!important}
.bar .tabs{width:100%!important;max-width:none!important}
.bar>#import{display:none!important}
.tools{
  position:relative!important;
  z-index:42!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 58px!important;
  gap:4px!important;
  width:100%!important;
  height:44px!important;
  margin:5px 0!important;
  padding:0!important;
  background:transparent!important;
}
.tools>#draw,.tools>#mulligan,.tools>#untap,
#h161-menu-toggle{
  display:block!important;
  position:relative!important;
  inset:auto!important;
  width:100%!important;
  min-width:0!important;
  height:44px!important;
  min-height:44px!important;
  margin:0!important;
  padding:0 5px!important;
  border:1px solid #554535!important;
  border-radius:9px!important;
  background:#312820!important;
  color:#f4eadb!important;
  font:800 10px/1 ui-monospace,Menlo,monospace!important;
  box-shadow:none!important;
}
#h161-menu-host{position:relative!important;width:58px!important;height:44px!important}
#h161-menu-toggle{cursor:pointer!important}
#h161-menu-toggle::before{
  content:'';
  position:absolute;
  left:50%;top:48%;
  width:9px;height:9px;
  border-right:2px solid #d3ad70;
  border-bottom:2px solid #d3ad70;
  transform:translate(-50%,-65%) rotate(45deg);
  transform-origin:center;
}
#h161-menu-host.h161-open #h161-menu-toggle::before{
  transform:translate(-50%,-20%) rotate(225deg);
}
#h161-menu-host.h161-open #h161-menu-toggle{
  background:#3a2f25!important;
  border-color:#8b7659!important;
}
#h161-menu{
  display:none;
  position:absolute;
  right:0;
  top:49px;
  width:58px;
  z-index:1000;
  flex-direction:column;
  gap:4px;
}
#h161-menu-host.h161-open #h161-menu{display:flex}
#h161-menu button{
  width:58px!important;
  height:44px!important;
  min-width:58px!important;
  min-height:44px!important;
  margin:0!important;
  padding:0 3px!important;
  border:1px solid #554535!important;
  border-radius:9px!important;
  background:#312820!important;
  color:#f4eadb!important;
  box-shadow:0 4px 10px #0008!important;
  font:800 8px/1 ui-monospace,Menlo,monospace!important;
}
#h161-menu button:active{background:#d3ad70!important;color:#211911!important}
@media(max-width:390px){
  .tools{grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 54px!important}
  #h161-menu-host{width:54px!important}
  #h161-menu{width:54px!important}
  #h161-menu button{width:54px!important;min-width:54px!important;font-size:7.5px!important}
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h161-top-inventory-menu">window.addEventListener('DOMContentLoaded',()=>{
    const tools=document.querySelector('.tools');
    const originalImport=document.getElementById('import');
    if(!tools||!originalImport||document.getElementById('h161-menu-host'))return;

    const host=document.createElement('div');
    host.id='h161-menu-host';
    host.innerHTML='<button id="h161-menu-toggle" type="button" aria-label="Open menu" aria-expanded="false"></button><div id="h161-menu" role="menu"><button id="h161-menu-import" type="button" role="menuitem">Import</button><button id="h161-menu-inventory" type="button" role="menuitem">Inventory</button></div>';
    tools.appendChild(host);

    const toggle=host.querySelector('#h161-menu-toggle');
    const close=()=>{host.classList.remove('h161-open');toggle.setAttribute('aria-expanded','false')};
    const open=()=>{host.classList.add('h161-open');toggle.setAttribute('aria-expanded','true')};

    toggle.addEventListener('click',e=>{e.stopPropagation();host.classList.contains('h161-open')?close():open()});
    host.querySelector('#h161-menu-import').addEventListener('click',()=>{close();originalImport.click()});
    host.querySelector('#h161-menu-inventory').addEventListener('click',()=>{
      close();
      const toast=document.getElementById('toast');
      if(toast){toast.textContent='Inventory';toast.classList.add('on');setTimeout(()=>toast.classList.remove('on'),700)}
    });
    document.addEventListener('pointerdown',e=>{if(!host.contains(e.target))close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h160.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
