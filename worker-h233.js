import h232 from './worker-h232.js';

const BUILD='H233';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H233_ACTIVE_VIEW_BRIDGE'))return out;

  const bridge=`
/* H233_ACTIVE_VIEW_BRIDGE
   Later view-restoration layers can change the selected tab and visible screen
   without running the base tab onclick handler. Keep the internal game view
   aligned with the visually selected tab. This bridge changes only st.view;
   Full Board layout/scroll behavior and both battlefield coordinate planes stay
   under their existing owners. */
function h233SetActiveView(view){
  if(view==='you'||view==='full'||view==='opp')st.view=view;
  return st.view;
}
window.MTG_H233_activeView={
  set:h233SetActiveView,
  get:()=>st.view
};
setTimeout(()=>{
  const view=document.querySelector('.tabs [data-v].on')?.dataset.v;
  h233SetActiveView(view);
},0);
`;
  out=out.replace('function render(){',bridge+'\nfunction render(){');
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h233-opponent-view-hand-sync'))return out;

  const css=`<style id="h233-opponent-view-hand-sync-style">
/* Keep the player's own hand usable above the dedicated Opponent battlefield.
   This intentionally overrides the older overlay-only hide rule without
   changing the hand's normal open/closed behavior. */
body.h157-opp-mode #hand{
  display:block!important;
  pointer-events:auto!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h233-opponent-view-hand-sync">window.addEventListener('DOMContentLoaded',()=>{
    const tabs=[...document.querySelectorAll('.tabs [data-v]')];
    if(!tabs.length)return;
    let queued=false;

    const visualView=()=>{
      const active=tabs.find(tab=>tab.classList.contains('on'))?.dataset.v;
      return active==='you'||active==='full'||active==='opp'?active:null;
    };
    const sync=()=>{
      queued=false;
      const view=visualView();if(!view)return;
      window.MTG_H233_activeView?.set?.(view);
      /* H232's dedicated Opponent gesture recognizer intentionally keys off
        this overlay mode. Set it in the same turn as the active tab so the
        first card tap after switching cannot race H157's periodic mirror. */
      document.body.classList.toggle('h157-opp-mode',view==='opp');
    };
    const queue=()=>{
      if(queued)return;queued=true;
      queueMicrotask(()=>requestAnimationFrame(sync));
    };

    /* Capture hand gestures so H211's existing drop handler always sees the
       correct view before it chooses a destination. Its dedicated Opponent
       path continues to place cards using #oppcards, including H223 snapping. */
    document.addEventListener('pointerdown',e=>{
      if(e.target.closest?.("#handrow .hcard"))sync();
    },true);

    tabs.forEach(tab=>{
      tab.addEventListener('pointerdown',queue,true);
      tab.addEventListener('click',queue);
    });
    new MutationObserver(queue).observe(document.querySelector('.tabs'),{subtree:true,attributes:true,attributeFilter:['class']});
    window.addEventListener('pageshow',queue);
    sync();setTimeout(sync,0);setTimeout(sync,120);
  });</script>`;
  out=out.replace('</body>',script+'\n<!-- h233-opponent-view-hand-sync -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h232.fetch(request,env,ctx);
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
