import h222 from './worker-h222.js';

const BUILD='H223';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H223_DEDICATED_OPPONENT_DRAG_PLANE'))return out;

  const helper=`
/* H223_DEDICATED_OPPONENT_DRAG_PLANE
   Dedicated Opponent movement must use the dedicated #oppcards coordinate plane,
   not h117HalfRect('opp'), which belongs to Full Board. */
function h223SnapOpponentDedicated(c){
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

  /* H124's dedicated Opponent drop path calculated x/y in #oppcards correctly,
     then snapped using the Full Board half rectangle. Keep the entire operation
     on the same dedicated coordinate plane. */
  out=out.replace(
    "h117SnapFieldPosition(c,'opp');h117BringFront(id,'opp');render();return;",
    "h223SnapOpponentDedicated(c);h117BringFront(id,'opp');render();return;"
  );

  /* H211 uses the same Full Board snap helper when placing a hand card directly
     onto the dedicated Opponent board. Correct that path too. */
  out=out.replace(
    "h117SnapFieldPosition(c,'opp');h117BringFront(c.id,'opp');c.tap=tapped;",
    "h223SnapOpponentDedicated(c);h117BringFront(c.id,'opp');c.tap=tapped;"
  );

  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h223-opponent-land-exact-parity'))return out;

  /* Remove H172's older 2% opponent-land runtime override. H199 established 5%
     as the confirmed dedicated/Full Board opponent-land top offset. */
  out=out.replace(
    "land.style.setProperty('top',(boardH*.02)+'px','important');",
    "land.style.setProperty('top',(boardH*.05)+'px','important');/* h223-opponent-land-exact-parity */"
  );

  const css=`<style id="h223-opponent-land-exact-parity-style">
/* Both opponent land zones use one visual rectangle: 17% from the left, 4% from
   the right, 5% from the top, and 27% of one normal battlefield in height. */
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

  const script=`<script id="h223-opponent-land-exact-parity">window.addEventListener('DOMContentLoaded',()=>{
    const board=document.getElementById('board');
    const viewport=document.getElementById('h105fullviewport');
    const dedicated=document.getElementById('h157-opp-land');
    if(!board||!dedicated)return;

    let raf=0;
    const sync=()=>{
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

    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>{
      sync();setTimeout(sync,90);setTimeout(sync,180);
    }));
    window.addEventListener('resize',sync,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(sync,80),{passive:true});
    window.addEventListener('pageshow',()=>setTimeout(sync,50));
    if(window.ResizeObserver){
      const ro=new ResizeObserver(sync);ro.observe(board);if(viewport)ro.observe(viewport);
    }
    sync();setTimeout(sync,100);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h222.fetch(request,env,ctx);
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
