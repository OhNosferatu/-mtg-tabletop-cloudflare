import h223 from './worker-h223.js';

const BUILD='H225';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h225-source-aware-fullboard-anchor'))return out;

  /* H225 removes arbitrary saved-scroll restoration when entering Full Board.
     The source screen now determines one deterministic opening anchor:
       Your Side -> divider at the top, player battlefield immediately below.
       Opponent  -> exact top of the opponent battlefield.
     H222's short hidden prewarm is retained so Safari receives the target
     scrollTop before Full Board is revealed. H223 geometry remains untouched. */
  const oldRestore=`fullTab?.addEventListener('click',()=>{
      /* h222-fullboard-preposition-before-reveal */
      const full=document.getElementById('full');
      if(full&&!full.classList.contains('on'))document.body.classList.add('h222-full-prewarm');
      /* Force the temporary hidden Full Board to participate in layout now, not
         on a later animation frame. Safari can then accept the saved scrollTop
         before the screen becomes visible. */
      void viewport.offsetHeight;
      const wanted=Math.max(0,Math.min(maxScroll(),savedScroll));
      openingFull=true;
      viewport.scrollTop=wanted;
      const bar=document.getElementById('h105fullscroll');if(bar)bar.value=String(Math.round(wanted));
      requestAnimationFrame(()=>{openingFull=false;alignOpponentCards()});
    },true);`;

  const newRestore=`fullTab?.addEventListener('click',()=>{
      /* h225-source-aware-fullboard-anchor */
      const source=document.querySelector('.tabs [data-v].on')?.dataset.v||'you';
      const full=document.getElementById('full');
      if(full&&!full.classList.contains('on'))document.body.classList.add('h222-full-prewarm');
      /* Force the temporary hidden Full Board to have real geometry before
         computing the deterministic anchor. */
      void viewport.offsetHeight;
      const max=maxScroll();
      let wanted=viewport.scrollTop;
      if(source==='opp'){
        wanted=0;
      }else if(source==='you'){
        /* One opponent-board height puts the divider flush at the viewport top.
           The divider itself is 58px tall, so the player's battlefield begins
           immediately beneath it. */
        wanted=Math.min(max,Math.max(0,viewport.clientHeight));
      }
      openingFull=true;
      savedScroll=wanted;
      viewport.scrollTop=wanted;
      const bar=document.getElementById('h105fullscroll');if(bar)bar.value=String(Math.round(wanted));
      requestAnimationFrame(()=>{openingFull=false;alignOpponentCards()});
    },true);`;

  out=out.replace(oldRestore,newRestore);

  const marker='\n<!-- h225-source-aware-fullboard-anchor -->\n';
  out=out.replace('</body>',marker+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h223.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
