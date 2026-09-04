import h229 from './worker-h229.js';

const BUILD='H235';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H235_ACTIVE_VIEW_PARITY'))return out;

  const bridge=`
/* H235_ACTIVE_VIEW_PARITY
   The selected tab is the source of truth for the internal game view. This is
   deliberately independent of board geometry: opponent cards keep their own
   #oppcards coordinate plane and Full Board keeps its existing H117/H178 plane. */
function h235SetActiveView(view){
  if(view==='you'||view==='full'||view==='opp')st.view=view;
  return st.view;
}
window.MTG_H235_activeView={set:h235SetActiveView,get:()=>st.view};
`;
  out=out.replace('function render(){',bridge+'\nfunction render(){');

  /* Route the original tab handler through the same setter. No screen layout,
     scroll, card-position, or Full Board logic is changed. */
  out=out.replace('st.view=b.dataset.v;if(st.view===\'opp\')',"h235SetActiveView(b.dataset.v);if(st.view==='opp')");
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h235-opponent-native-parity'))return out;

  /* H209 is only a viewer reliability fallback. Restore its original uniform
     delay so dedicated Opponent cards do not have a different tap window from
     Your Side or Full Board. H124 remains the sole battlefield gesture owner. */
  out=out.replace(
    "},ownerFor(cur.card)==='opp'&&document.body.classList.contains('h157-opp-mode')?725:DOUBLE_MS+55);",
    '},DOUBLE_MS+55);'
  );

  const css=`<style id="h235-opponent-native-parity-style">
/* Keep the player's own private hand available while the dedicated Opponent
   battlefield is active. Opponent hand privacy remains unchanged. */
body.h157-opp-mode #hand{
  display:block!important;
  pointer-events:auto!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h235-opponent-native-parity">window.addEventListener('DOMContentLoaded',()=>{
    const tabs=[...document.querySelectorAll('.tabs [data-v]')];
    if(!tabs.length)return;
    let raf=0;
    const visualView=()=>{
      const view=tabs.find(tab=>tab.classList.contains('on'))?.dataset.v;
      return view==='you'||view==='full'||view==='opp'?view:null;
    };
    const sync=()=>{
      cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
        const view=visualView();if(!view)return;
        window.MTG_H235_activeView?.set?.(view);
        document.body.classList.toggle('h157-opp-mode',view==='opp');
      });
    };

    /* H124 already owns #field, #oppcards and #fullcards with one recognizer:
       single tap=view, double tap=90deg rotate, long press=move. H235 does not
       install any Opponent-only pointer/click recognizer. */
    tabs.forEach(tab=>{
      tab.addEventListener('pointerdown',sync,true);
      tab.addEventListener('click',sync);
    });
    new MutationObserver(sync).observe(document.querySelector('.tabs'),{subtree:true,attributes:true,attributeFilter:['class']});

    /* H211's existing hand drop path already supports st.view==='opp'. Sync the
       internal view before a hand drag begins so release onto #oppcards always
       uses the opponent field placement path. */
    document.addEventListener('pointerdown',e=>{
      if(!e.target.closest?.('#handrow .hcard'))return;
      const view=visualView();if(view)window.MTG_H235_activeView?.set?.(view);
    },true);

    window.addEventListener('pageshow',sync);sync();setTimeout(sync,80);
  });</script>`;
  out=out.replace('</body>',script+'\n<!-- h235-opponent-native-parity -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    /* Build directly on H229: this keeps H228/H197/H178 screen behavior and
       H229 tapped-card alignment while excluding H232-H234's Opponent-only
       gesture experiments. */
    const response=await h229.fetch(request,env,ctx);
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
