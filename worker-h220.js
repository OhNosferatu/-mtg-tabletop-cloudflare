import h219 from './worker-h219.js';

const BUILD='H220';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h220-fullboard-anchor-after-visible-layout'))return out;

  /* H219 measured #h105divider.offsetTop inside H178's capture-phase click
     listener. At that moment Full Board is still display:none, so Safari reports
     offsetTop as 0. That zero then becomes the opening target, which explains why
     Full Board keeps landing at the opponent/top edge. Measure only after the tab
     switch has made Full Board participate in layout. H197 keeps the viewport
     hidden during this settle window, so the user never sees an intermediate frame. */
  const oldHandler=`fullTab?.addEventListener('click',()=>{
      openingFull=true;
      const divider=document.getElementById('h105divider');const wanted=Math.max(0,divider?.offsetTop||0);/* h219-fullboard-fixed-divider-anchor */
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        savedScroll=wanted;try{sessionStorage.setItem('mtg_full_scroll_v2',String(wanted))}catch{}restoreScroll();
        setTimeout(()=>{savedScroll=wanted;try{sessionStorage.setItem('mtg_full_scroll_v2',String(wanted))}catch{}restoreScroll()},90);
      }));
    },true);`;

  const newHandler=`fullTab?.addEventListener('click',()=>{
      openingFull=true;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        /* h220-fullboard-anchor-after-visible-layout */
        const divider=document.getElementById('h105divider');
        const wanted=Math.max(0,divider?.offsetTop||viewport.clientHeight||0);
        savedScroll=wanted;try{sessionStorage.setItem('mtg_full_scroll_v2',String(wanted))}catch{}restoreScroll();
        setTimeout(()=>{
          const freshDivider=document.getElementById('h105divider');
          const freshWanted=Math.max(0,freshDivider?.offsetTop||viewport.clientHeight||wanted);
          savedScroll=freshWanted;try{sessionStorage.setItem('mtg_full_scroll_v2',String(freshWanted))}catch{}restoreScroll();
        },90);
      }));
    },true);`;

  out=out.replace(oldHandler,newHandler);
  const marker='\n<!-- h220-fullboard-anchor-after-visible-layout -->\n';
  out=out.replace('</body>',marker+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h219.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
