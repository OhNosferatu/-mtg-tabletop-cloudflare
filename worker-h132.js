import h131 from './worker-h131.js';

const BUILD='H132';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source;
  if(out.includes('h132-fullboard-visual-parity'))return out;

  out=out.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
         .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);

  const css=`<style id="h132-fullboard-visual-parity">
/* H132: Full Board is the visual source of truth. The outer card boxes were
   already the same physical size; Your Side looked slightly larger because its
   card image used cover while Full Board used contain. Match the face rendering
   without changing any battlefield geometry or stored card coordinates. */
#field .card>img,
#oppcards .card>img{
  width:100%!important;
  height:100%!important;
  object-fit:contain!important;
  object-position:center!important;
}

/* Exact battlefield counter-pill parity. Cover both the current combined badge
   and any older counter-stack element that exists for a frame during rerender. */
#field .card .badge.counter-total,
#field .card .badge.counter-stack,
#oppcards .card .badge.counter-total,
#oppcards .card .badge.counter-stack,
#fullcards .card .badge.counter-total,
#fullcards .card .badge.counter-stack{
  right:1px!important;
  bottom:1px!important;
  min-width:0!important;
  max-width:none!important;
  width:auto!important;
  height:auto!important;
  padding:2px 3px!important;
  gap:0!important;
  border-radius:4px!important;
  border-width:1px!important;
  background:rgba(21,17,15,.9)!important;
  color:#fff!important;
  box-shadow:0 1px 3px #0008!important;
  font-size:8px!important;
  font-weight:1000!important;
  line-height:1!important;
  letter-spacing:normal!important;
  white-space:nowrap!important;
  display:block!important;
  box-sizing:border-box!important;
  -webkit-text-size-adjust:100%!important;
  text-size-adjust:100%!important;
}
#field .card .badge.counter-total *,
#field .card .badge.counter-stack *,
#oppcards .card .badge.counter-total *,
#oppcards .card .badge.counter-stack *,
#fullcards .card .badge.counter-total *,
#fullcards .card .badge.counter-stack *{
  font-size:inherit!important;
  font-weight:inherit!important;
  line-height:inherit!important;
  letter-spacing:inherit!important;
  border:0!important;
  margin:0!important;
  padding:0!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h132-build-sync">window.addEventListener('DOMContentLoaded',()=>{
    let current='${BUILD}',queued=false;
    const apply=()=>{
      queued=false;
      document.querySelectorAll('.hand-build').forEach(el=>el.textContent=current);
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
      while((node=walker.nextNode())){
        const p=node.parentElement;if(!p||/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(p.tagName))continue;
        const v=node.nodeValue||'';if(!/(MTG TableTop|Game loaded)/i.test(v))continue;
        node.nodeValue=v.replace(/H\d+/g,current);
      }
      document.documentElement.dataset.mtgBuild=current;window.MTG_BUILD=current;
    };
    const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(apply)};
    new MutationObserver(queue).observe(document.body,{childList:true,subtree:true,characterData:true});
    fetch('/api/health?from='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(d?.build)current=String(d.build);queue()}).catch(()=>{});
    queue();setTimeout(queue,150);setTimeout(queue,700);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h131.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
