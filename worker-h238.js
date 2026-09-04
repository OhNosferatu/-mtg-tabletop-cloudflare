import h237 from './worker-h237.js';

const BUILD='H238';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h238-start-on-your-side'))return out;

  /* H195 restores the last selected tab from sessionStorage on page load. That
     can make a fresh game open directly to Full Board. Keep all normal switching
     behavior after load, but make the initial game screen deterministically You. */
  const oldInitial=`    let initial=document.querySelector('.tabs [data-v].on')?.dataset.v||'full';
    try{const saved=sessionStorage.getItem(VIEW_KEY);if(['you','full','opp'].includes(saved))initial=saved}catch{}
    requested=initial;
    settle(initial);`;
  const newInitial=`    /* h238-start-on-your-side */
    const initial='you';
    requested=initial;
    try{sessionStorage.setItem(VIEW_KEY,initial)}catch{}
    settle(initial);`;
  out=out.replace(oldInitial,newInitial);

  const marker='\n<!-- h238-start-on-your-side -->\n';
  out=out.replace('</body>',marker+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h237.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
