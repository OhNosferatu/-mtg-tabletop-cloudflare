import h195 from './worker-h195.js';

const BUILD='H196';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h196-no-fullboard-entry-snap'))return out;

  const script=`<script id="h196-no-fullboard-entry-snap">window.addEventListener('DOMContentLoaded',()=>{
    const fullTab=document.querySelector('.tabs [data-v="full"]');
    const viewport=document.getElementById('h105fullviewport');
    const content=document.getElementById('h105fullcontent');
    if(!fullTab||!viewport||!content)return;

    /* H176 still contains a legacy Full Board click listener that forces
       scrollTop=0 before H178 restores the remembered position. That reset is
       what produces the visible jump to the opponent-board top. Intercept only
       the Full Board tab click before those older bubble listeners run, invoke
       the game's original tab switch directly, and restore the saved position
       in the same event frame so the wrong position is never painted. */
    const originalSwitch=fullTab.onclick;
    const readSaved=()=>{
      try{return Math.max(0,Number(sessionStorage.getItem('mtg_full_scroll_v2'))||0)}catch{return 0}
    };
    const clampSaved=()=>Math.max(0,Math.min(Math.max(0,content.scrollHeight-viewport.clientHeight),readSaved()));
    const setSavedPosition=()=>{
      const y=clampSaved();
      viewport.scrollTop=y;
      const bar=document.getElementById('h105fullscroll');
      if(bar)bar.value=String(Math.round(y));
    };

    fullTab.addEventListener('click',e=>{
      e.preventDefault();
      e.stopImmediatePropagation();

      /* Preserve the base app's own state update without firing the legacy
         addEventListener chain that includes the scroll-to-zero behavior. */
      if(typeof originalSwitch==='function')originalSwitch.call(fullTab,e);
      else{
        document.querySelectorAll('.tabs [data-v]').forEach(tab=>tab.classList.toggle('on',tab===fullTab));
        document.querySelectorAll('.screen').forEach(screen=>screen.classList.toggle('on',screen.id==='full'));
      }
      try{sessionStorage.setItem('mtg_active_view_v4','full')}catch{}

      /* Apply before the browser paints the newly-visible Full Board. H178's
         later restore may run too, but it restores the same value and no reset
         to zero is allowed to run in between. */
      setSavedPosition();
      requestAnimationFrame(setSavedPosition);
    },true);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h195.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
