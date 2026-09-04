import h217 from './worker-h217.js';

const BUILD='H228';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H228_DEDICATED_OPPONENT_DRAG_PLANE'))return out;

  const helper=`
/* H228_DEDICATED_OPPONENT_DRAG_PLANE
   Preserve H223's dedicated Opponent movement fix while returning the screen/
   scroll system to the H217 -> H197 confirmed-stable chain. */
function h228SnapOpponentDedicated(c){
  const r=$('#oppcards')?.getBoundingClientRect();
  if(!c||!r||!r.width||!r.height)return null;
  const size=fieldCardSize();
  const left=c.x/100*r.width,top=c.y/100*r.height;
  const a={left,top,right:left+size.w,bottom:top+size.h,width:size.w,height:size.h};
  let best=null,bestRatio=.65;
  for(const id of st.opp){
    if(id===c.id)continue;
    const o=st.cards[id];if(!o)continue;
    const l=o.x/100*r.width,t=o.y/100*r.height;
    const b={left:l,top:t,right:l+size.w,bottom:t+size.h,width:size.w,height:size.h};
    const ratio=overlapRatio(a,b);
    if(ratio>=bestRatio){best=o;bestRatio=ratio}
  }
  if(best){c.x=best.x;c.y=best.y;return best.id}
  return null;
}
`;
  out=out.replace('function render(){',helper+'\nfunction render(){');

  out=out.replace(
    "h117SnapFieldPosition(c,'opp');h117BringFront(id,'opp');render();return;",
    "h228SnapOpponentDedicated(c);h117BringFront(id,'opp');render();return;"
  );
  out=out.replace(
    "h117SnapFieldPosition(c,'opp');h117BringFront(c.id,'opp');c.tap=tapped;",
    "h228SnapOpponentDedicated(c);h117BringFront(c.id,'opp');c.tap=tapped;"
  );

  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h228-restored-confirmed-scroll-baseline'))return out;

  /* H217 already contains the exact H178 scroll-memory + H197 hidden-settle
     system that the user previously confirmed as working. H228 deliberately
     does NOT add any H218-H227 transition/prewarm/source-anchor logic. */

  /* Preserve the H223 land-zone correction without importing H222 or any later
     screen-transition experiments. H172's runtime 2% Full Board land override
     is replaced with the confirmed 5% geometry. */
  out=out.replace(
    "land.style.setProperty('top',(boardH*.02)+'px','important');",
    "land.style.setProperty('top',(boardH*.05)+'px','important');/* h228-restored-confirmed-scroll-baseline */"
  );

  const css=`<style id="h228-restored-confirmed-scroll-baseline-style">
/* Keep the confirmed opponent land-zone parity from H223 while leaving the
   H197 screen visibility/settle system completely untouched. */
body.h157-opp-mode #h157-opp-land,
#h105fullcontent .h133-land-opp{
  box-sizing:border-box!important;
  border-radius:12px!important;
}
body.h157-opp-mode #h157-opp-land{
  left:17%!important;
  right:4%!important;
  top:5%!important;
  height:27%!important;
  width:auto!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h228-restored-confirmed-scroll-baseline">window.addEventListener('DOMContentLoaded',()=>{
    /* H217/H197/H178 own all screen switching and Full Board scroll restoration.
       This script only keeps land rectangles dimensionally identical after a
       resize/view change; it never writes Full Board scrollTop or visibility. */
    const board=document.getElementById('board');
    const viewport=document.getElementById('h105fullviewport');
    const dedicated=document.getElementById('h157-opp-land');
    if(!board||!dedicated)return;
    let raf=0;
    const syncLand=()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const br=board.getBoundingClientRect();
        if(br.width>0&&br.height>0){
          dedicated.style.setProperty('left',(br.width*.17)+'px','important');
          dedicated.style.setProperty('right','auto','important');
          dedicated.style.setProperty('width',(br.width*.79)+'px','important');
          dedicated.style.setProperty('top',(br.height*.05)+'px','important');
          dedicated.style.setProperty('height',(br.height*.27)+'px','important');
        }
        const fullLand=document.querySelector('#h105fullcontent .h133-land-opp');
        if(fullLand&&viewport&&viewport.clientWidth>0&&viewport.clientHeight>0){
          const w=viewport.clientWidth,h=viewport.clientHeight;
          fullLand.style.setProperty('left',(w*.17)+'px','important');
          fullLand.style.setProperty('right','auto','important');
          fullLand.style.setProperty('width',(w*.79)+'px','important');
          fullLand.style.setProperty('top',(h*.05)+'px','important');
          fullLand.style.setProperty('height',(h*.27)+'px','important');
        }
      });
    };
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>requestAnimationFrame(syncLand)));
    window.addEventListener('resize',syncLand,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(syncLand,80),{passive:true});
    window.addEventListener('pageshow',()=>setTimeout(syncLand,50));
    syncLand();setTimeout(syncLand,100);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h217.fetch(request,env,ctx);
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
