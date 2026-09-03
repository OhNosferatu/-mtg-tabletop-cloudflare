import h212 from './worker-h212.js';

const BUILD='H217';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h217-player-piles-screen-edge-parity'))return out;

  const css=`<style id="h217-player-piles-screen-edge-parity-style">
/* H217 discards the H213-H216 percentage/nudge experiments and uses the actual
   Full Board screen edge as the horizontal source of truth. The measured value
   lives on #you as a CSS variable so H116 cannot clone an inline left offset
   back into the Full Board pile layer. */
body #you #cmds,
body #you #exile,
body #you #deck,
body #you #graveyard,
body #you #tokens{
  left:var(--h217-player-pile-left,2%)!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h217-player-piles-screen-edge-parity">window.addEventListener('DOMContentLoaded',()=>{
    const full=document.getElementById('full');
    const layer=document.getElementById('h116-piles-you');
    const you=document.getElementById('you');
    if(!full||!layer||!you)return;

    let raf=0;
    const measure=()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const oldStyle=full.getAttribute('style');
        const hidden=getComputedStyle(full).display==='none'||full.getBoundingClientRect().width===0;
        if(hidden){
          full.style.setProperty('display','block','important');
          full.style.setProperty('visibility','hidden','important');
          full.style.setProperty('pointer-events','none','important');
        }

        const src=layer.querySelector('[data-h117-zone="cmd"],.h116-cmd');
        const fr=full.getBoundingClientRect();
        const sr=src?.getBoundingClientRect();
        if(src&&fr.width>0&&sr&&sr.width>0){
          /* Measure what the user actually sees: Full Board pile left edge minus
             Full Board screen left edge. This includes every nested layer/content
             offset that H216 accidentally omitted. */
          const visualGap=Math.max(0,sr.left-fr.left);
          you.style.setProperty('--h217-player-pile-left',visualGap+'px');
        }

        if(hidden){
          if(oldStyle===null)full.removeAttribute('style');
          else full.setAttribute('style',oldStyle);
        }
      });
    };

    measure();setTimeout(measure,80);setTimeout(measure,220);
    document.querySelector('[data-v="full"]')?.addEventListener('click',()=>requestAnimationFrame(measure));
    document.querySelector('[data-v="you"]')?.addEventListener('click',measure);
    window.addEventListener('resize',measure,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(measure,80),{passive:true});
    window.addEventListener('pageshow',()=>setTimeout(measure,50));
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h212.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
