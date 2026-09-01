import h72 from './worker-h72.js';

const BUILD='H73';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  const start=source.indexOf('function zoneDrag(');
  const end=source.indexOf('function syncHandScroller',start);
  if(start<0||end<0)return source;

  const replacement=`function zoneDrag(el,id,from,{forceBack=false,label=''}={}){
  const c=st.cards[id];if(!c)return;
  let s=null,ghost=null,moved=false;
  el.onpointerdown=e=>{
    e.preventDefault();
    s={x:e.clientX,y:e.clientY,pid:e.pointerId};
    moved=false;
    try{el.setPointerCapture?.(e.pointerId)}catch{}
  };
  el.onpointermove=e=>{
    if(!s)return;
    if(!moved&&Math.hypot(e.clientX-s.x,e.clientY-s.y)>8){moved=true;ghost=makeGhost(c,forceBack)}
    if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px'}
  };
  el.onpointerup=async e=>{
    if(!s)return;
    const pid=s.pid;s=null;
    try{el.releasePointerCapture?.(pid)}catch{}
    ghost?.remove();ghost=null;

    if(!moved){
      if(from==='deck'){openDeckOptions();return}
      if(from==='tokens'){
        requestAnimationFrame(()=>openBoardZoom(c));
        return;
      }
      openCard(c,true);
      return;
    }
    moved=false;

    if(handHit(e.clientX,e.clientY)){
      await moveToHandAt(id,e.clientX);
      return;
    }

    const r=fieldRect();
    if(pointInRect(e.clientX,e.clientY,r)){
      placeOnField(id,e.clientX,e.clientY,forceBack);
      if(!forceBack&&!c.img)load(c).then(()=>{if(c.zone==='field')render()});
      render();
    }
  };
  el.onpointercancel=e=>{
    if(s){try{el.releasePointerCapture?.(s.pid)}catch{}}
    s=null;moved=false;ghost?.remove();ghost=null;
  };
  el.oncontextmenu=e=>e.preventDefault();
}
`;

  return source.slice(0,start)+replacement+source.slice(end);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h72.fetch(request,env,ctx);

    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }

    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      const out=text.replaceAll('H72','H73').replaceAll('h72-','h73-');
      return new Response(out,{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }

    return response;
  }
};
