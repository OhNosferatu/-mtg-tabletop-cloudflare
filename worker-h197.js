import h195 from './worker-h195.js';

const BUILD='H197';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h197-hide-fullboard-during-legacy-scroll-settle'))return out;

  const css=`<style id="h197-hide-fullboard-during-legacy-scroll-settle-style">
/* H197 keeps the H195/H178 geometry completely untouched. The remaining flicker
   comes from legacy Full Board handlers briefly painting the old scroll position
   before H178 restores the saved one. Hide only the Full Board scroll viewport
   during that tiny settle window so no incorrect intermediate frame is visible. */
body.h197-full-settling #h105fullviewport,
body.h197-full-settling #h105fullscroll{
  visibility:hidden!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h197-hide-fullboard-during-legacy-scroll-settle">window.addEventListener('DOMContentLoaded',()=>{
    const fullTab=document.querySelector('.tabs [data-v="full"]');
    if(!fullTab)return;
    let timer=0;
    const hide=()=>{
      clearTimeout(timer);
      document.body.classList.add('h197-full-settling');
      /* H178 performs its final saved-position restore after the older Full Board
         handlers finish, including its 90ms follow-up. Reveal only after that. */
      timer=setTimeout(()=>{
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          document.body.classList.remove('h197-full-settling');
        }));
      },115);
    };
    fullTab.addEventListener('pointerdown',hide,true);
    fullTab.addEventListener('click',()=>{
      if(!document.body.classList.contains('h197-full-settling'))hide();
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
