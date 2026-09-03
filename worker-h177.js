import h176 from './worker-h176.js';

const BUILD='H177';
const DIVIDER=58;
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=stamp(source);
  if(out.includes('H177_EXACT_OWNER_CARD_PLANE'))return out;

  /* H177_EXACT_OWNER_CARD_PLANE
     Full Board cards use the exact owner board rect returned by h117HalfRect.
     No percentage is taken against the combined two-board card layer. */
  out=out.replace(
    "d.style.left=c.x+'%';d.style.top=(owner==='you'?50+c.y*.5:c.y*.5)+'%';d.style.zIndex=String(20+index);d.dataset.h117Owner=owner;",
    "{const rr=h117HalfRect(owner),cr=$('#h105fullcontent')?.getBoundingClientRect();if(rr&&cr){d.style.left=(rr.left-cr.left+(c.x/100)*rr.width)+'px';d.style.top=(rr.top-cr.top+(c.y/100)*rr.height)+'px'}else{d.style.left=c.x+'%';d.style.top=c.y+'%'}}d.style.zIndex=String(20+index);d.dataset.h117Owner=owner;"
  );
  out=out.replace(
    "c.x=x/drag.r.width*100;c.y=y/drag.r.height*100;d.style.left=c.x+'%';d.style.top=(owner==='you'?50+c.y*.5:c.y*.5)+'%';",
    "c.x=x/drag.r.width*100;c.y=y/drag.r.height*100;{const cr=$('#h105fullcontent')?.getBoundingClientRect();if(cr){d.style.left=(drag.r.left-cr.left+(c.x/100)*drag.r.width)+'px';d.style.top=(drag.r.top-cr.top+(c.y/100)*drag.r.height)+'px'}}"
  );
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h177-board-polish'))return out;

  const css=`<style id="h177-board-polish">
/* Remove H176's temporary board-boundary pseudo rules. */
#h105fullcontent::before,#h105fullcontent::after{display:none!important;content:none!important;background:none!important}

/* Reassert the approved Your Side pile order:
   Commander -> Exile -> Deck -> Graveyard -> Tokens. */
#you .cmds{top:13.5%!important}
#you .exile{top:30%!important}
#you .deck{top:46.5%!important}
#you .graveyard{top:63%!important}
#you .tokens{top:79.5%!important}

/* One label treatment across Your Side, Opponent Side and Full Board. */
#you .zone::after,#you .cmd::after,
#h157-opp-piles .zone::after,#h157-opp-piles .cmd::after,
#h116-piles-you .zone::after,#h116-piles-you .cmd::after,
#h116-piles-opp .zone::after,#h116-piles-opp .cmd::after{
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;
  font-size:7px!important;
  font-weight:900!important;
  line-height:1!important;
  letter-spacing:.08em!important;
  color:rgba(224,228,232,.88)!important;
  text-transform:uppercase!important;
  bottom:-14px!important;
  white-space:nowrap!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h177-board-polish">window.addEventListener('DOMContentLoaded',()=>{
    const viewport=document.getElementById('h105fullviewport');
    const content=document.getElementById('h105fullcontent');
    if(!viewport||!content)return;

    let lastFullScroll=0;
    try{lastFullScroll=Math.max(0,Number(sessionStorage.getItem('mtg_h177_full_scroll'))||0)}catch{}
    const maxScroll=()=>Math.max(0,content.scrollHeight-viewport.clientHeight);
    const remember=()=>{
      lastFullScroll=Math.max(0,Math.min(maxScroll(),viewport.scrollTop));
      try{sessionStorage.setItem('mtg_h177_full_scroll',String(lastFullScroll))}catch{}
    };
    const restore=()=>{
      const y=Math.max(0,Math.min(maxScroll(),lastFullScroll));
      viewport.scrollTop=y;
      const bar=document.getElementById('h105fullscroll');
      if(bar){bar.value=String(Math.round(y))}
    };
    viewport.addEventListener('scroll',remember,{passive:true});

    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>{
      if(btn.dataset.v==='full'){
        /* H105/H176 both have older open handlers. Restore after those finish. */
        requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(restore)));
        setTimeout(restore,60);
      }else{
        remember();
      }
    }));

    window.addEventListener('pageshow',()=>setTimeout(()=>{if(document.querySelector('[data-v="full"]')?.classList.contains('on'))restore()},60));
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h176.fetch(request,env,ctx);
    if(url.pathname.endsWith('.js')){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers(response.headers.get('content-type')||'application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
