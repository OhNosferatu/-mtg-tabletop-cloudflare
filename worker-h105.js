import h102 from './worker-h102.js';

const BUILD='H105';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H105_CONTINUOUS_FULL_BOARD'))return source;
  let out=source;

  // The virtual table is 153.846% of the visible Full Board, so the viewport
  // shows exactly 65% of the full two-player table at once. Each player's
  // battlefield is uniformly miniaturized to 42% in X, Y, and card size.
  // These percentages are relative to the taller virtual canvas.
  out=out.replace(
    "const copy={...s,x:25+s.x*.5,y:50+s.y*.5};",
    "const copy={...s,x:29+s.x*.42,y:61.35+s.y*.273};"
  );
  out=out.replace(
    "const copy={...s,x:25+s.x*.5,y:s.y*.5};",
    "const copy={...s,x:29+s.x*.42,y:11.35+s.y*.273};"
  );

  const marker='\n/* H105_CONTINUOUS_FULL_BOARD */\n';
  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+marker+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source.replaceAll('H102','H105').replaceAll('h102-','h105-');
  if(out.includes('h105-continuous-fullboard-style'))return out;

  const css=`<style id="h105-continuous-fullboard-style">
#full{overflow:hidden!important}
#full:before{display:none!important}
#h105fullviewport{position:absolute;inset:0;z-index:7;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;scrollbar-width:none;touch-action:pan-y}
#h105fullviewport::-webkit-scrollbar{display:none}
#h105fullcontent{position:relative;width:100%;height:153.846%;min-height:153.846%;background:transparent}
#h105divider{position:absolute;left:2%;right:2%;top:50%;height:1px;background:rgba(235,214,176,.38);box-shadow:0 0 0 1px rgba(35,27,21,.35),0 0 12px rgba(0,0,0,.2);z-index:12;pointer-events:none}
#h105fullcontent #fullcards{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;z-index:8!important}
#h105fullcontent .life-heart[data-life="opp"]{left:auto!important;right:7px!important;top:calc(50% - 27px)!important;z-index:40!important}
#h105fullcontent .life-heart[data-life="you"]{left:7px!important;right:auto!important;top:calc(50% - 27px)!important;z-index:40!important}
#fullcards .card{width:38px!important;touch-action:pan-y!important;cursor:pointer}
#fullcards .card .badge{font-size:5px!important;padding:2px!important;right:1px!important;bottom:1px!important}
#h105fullscroll{position:absolute;right:2px;top:8%;height:84%;width:22px;z-index:60;writing-mode:vertical-lr;direction:rtl;-webkit-appearance:slider-vertical;appearance:slider-vertical;accent-color:#d7b46a;touch-action:none;opacity:.9}
#h105fullscroll::-webkit-slider-runnable-track{width:5px;border-radius:999px;background:#6c5b47}
#h105fullscroll::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:28px;border-radius:999px;background:#e1bf78;border:2px solid #2a2119}
@media(max-width:390px){#fullcards .card{width:38px!important}#h105fullcontent .life-heart[data-life="opp"],#h105fullcontent .life-heart[data-life="you"]{top:calc(50% - 25px)!important}#h105fullscroll{right:1px;width:20px}}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h105-continuous-fullboard-script">window.addEventListener('DOMContentLoaded',()=>{
    const full=document.getElementById('full');
    const cards=document.getElementById('fullcards');
    if(!full||!cards||document.getElementById('h105fullviewport'))return;

    const viewport=document.createElement('div');
    viewport.id='h105fullviewport';
    const content=document.createElement('div');
    content.id='h105fullcontent';
    const divider=document.createElement('div');
    divider.id='h105divider';

    const lives=[...full.querySelectorAll('.life-heart[data-life]')];
    content.appendChild(divider);
    lives.forEach(el=>content.appendChild(el));
    content.appendChild(cards);
    viewport.appendChild(content);
    full.appendChild(viewport);

    const bar=document.createElement('input');
    bar.id='h105fullscroll';
    bar.type='range';bar.min='0';bar.max='1';bar.step='1';bar.value='0';
    bar.setAttribute('aria-label','Scroll Full Board');
    full.appendChild(bar);

    let settingFromBar=false;
    const maxScroll=()=>Math.max(0,viewport.scrollHeight-viewport.clientHeight);
    const syncBar=()=>{
      if(settingFromBar)return;
      const max=maxScroll();
      bar.max=String(Math.max(1,Math.round(max)));
      bar.value=String(Math.min(max,Math.round(viewport.scrollTop)));
      bar.disabled=max<=1;
    };
    const centerBoard=()=>requestAnimationFrame(()=>{
      viewport.scrollTop=maxScroll()/2;
      syncBar();
    });

    bar.addEventListener('input',()=>{
      settingFromBar=true;
      viewport.scrollTop=Number(bar.value)||0;
      requestAnimationFrame(()=>{settingFromBar=false;syncBar()});
    });
    viewport.addEventListener('scroll',syncBar,{passive:true});
    window.addEventListener('resize',syncBar,{passive:true});
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>{
      if(btn.dataset.v==='full')centerBoard();
    }));
    if(full.classList.contains('on'))centerBoard();else syncBar();
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h102.fetch(request,env,ctx);
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
