import h161 from './worker-h161.js';

const BUILD='H162';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h162-inventory-modal'))return out;

  const css=`<style id="h162-inventory-modal-style">
/* H162: Inventory uses the same modal language as Import Deck. */
#h162inventory .box{width:min(95vw,550px)!important}
#h162inventory h3{margin:0 0 10px!important;font-size:16px!important}
#h162inventory .h162-inventory-body{
  min-height:190px;
  border:1px solid #594838;
  border-radius:8px;
  background:#14110f;
  padding:12px;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  color:#b9aa98;
  font-size:10px;
  line-height:1.5;
}
#h162inventory .actions{margin-top:8px!important}
#h162inventory .actions button{
  min-height:38px;
  border:1px solid #594838;
  border-radius:8px;
  background:#30271f;
  color:#f4eadb;
  font-weight:800;
  padding:0 14px;
}
#h162inventory .actions button:active{background:#d3ad70;color:#211911}
@media(min-width:900px){#h162inventory .box{width:min(720px,70vw)!important;padding:18px!important}.h162-inventory-body{min-height:260px!important}}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const modal=`<div id="h162inventory" class="modal" aria-hidden="true">
  <div class="box" role="dialog" aria-modal="true" aria-labelledby="h162inventory-title">
    <h3 id="h162inventory-title">Inventory</h3>
    <div class="h162-inventory-body">Inventory items will appear here.</div>
    <div class="actions"><button id="h162inventory-close" type="button">Close</button></div>
  </div>
</div>`;
  out=out.replace('<div id="imp" class="modal">',modal+'<div id="imp" class="modal">');

  const script=`<script id="h162-inventory-modal">window.addEventListener('DOMContentLoaded',()=>{
    const modal=document.getElementById('h162inventory');
    const closeBtn=document.getElementById('h162inventory-close');
    const oldBtn=document.getElementById('h161-menu-inventory');
    if(!modal||!closeBtn||!oldBtn)return;

    const btn=oldBtn.cloneNode(true);
    oldBtn.replaceWith(btn);

    const open=()=>{modal.classList.add('on');modal.setAttribute('aria-hidden','false');requestAnimationFrame(()=>closeBtn.focus())};
    const close=()=>{modal.classList.remove('on');modal.setAttribute('aria-hidden','true')};

    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();document.getElementById('h161-menu-host')?.classList.remove('h161-open');document.getElementById('h161-menu-toggle')?.setAttribute('aria-expanded','false');open()});
    closeBtn.addEventListener('click',close);
    modal.addEventListener('pointerdown',e=>{if(e.target===modal)close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('on'))close()});
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h161.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
