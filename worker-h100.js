import h99 from './worker-h99.js';

const BUILD='H100';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H100_FULL_BOARD_PHASE1'))return source;
  let out=source;

  // Counters should remain visible on read-only Full Board / Opponent copies.
  out=out.replace(
    'if(movable&&(c.p1||c.p!==null||c.t!==null)){',
    'if(c.p1||c.p!==null||c.t!==null){'
  );

  // Full Board is a true two-sided overview. Preserve each card's relative
  // battlefield position while fitting it into its player's half of the table.
  const oldFull="st.field.forEach(id=>{const s=st.cards[id],copy={...s,x:18+s.x*.62,y:54+s.y*.32};ff.appendChild(cardEl(copy,false))});st.opp.forEach(id=>{const s=st.cards[id],copy={...s,x:18+s.x*.62,y:4+s.y*.32};ff.appendChild(cardEl(copy,false))});";
  const newFull="st.field.forEach((id,i)=>{const s=st.cards[id];if(!s)return;const copy={...s,x:4+s.x*.92,y:52+s.y*.42};const el=cardEl(copy,false);el.classList.add('full-you-card');el.style.zIndex=String(20+i);ff.appendChild(el)});st.opp.forEach((id,i)=>{const s=st.cards[id];if(!s)return;const copy={...s,x:4+s.x*.92,y:3+s.y*.42};const el=cardEl(copy,false);el.classList.add('full-opp-card');el.style.zIndex=String(20+i);ff.appendChild(el)});";
  out=out.replace(oldFull,newFull);

  const marker='\n/* H100_FULL_BOARD_PHASE1 */\n';
  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+marker+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source.replaceAll('H99','H100').replaceAll('h99-','h100-');
  if(out.includes('h100-fullboard-style'))return out;
  const css=`<style id="h100-fullboard-style">
#full{overflow:hidden!important}
#full:before{content:"";position:absolute;left:2%;right:2%;top:50%;height:1px;background:rgba(235,214,176,.38);box-shadow:0 0 0 1px rgba(35,27,21,.35),0 0 12px rgba(0,0,0,.2);z-index:12;pointer-events:none}
#full .title{left:50%!important;top:6px!important;transform:translateX(-50%);background:#1814118f!important;color:#d9c7aa!important;letter-spacing:.08em;z-index:13!important}
#full .life-heart[data-life="opp"]{left:auto!important;right:7px!important;top:calc(50% - 27px)!important;z-index:40!important}
#full .life-heart[data-life="you"]{left:7px!important;right:auto!important;top:calc(50% - 27px)!important;z-index:40!important}
#fullcards{position:absolute!important;inset:0!important;z-index:8!important}
#fullcards .card{width:76px!important;touch-action:manipulation!important;cursor:pointer}
#fullcards .card .badge{font-size:7px!important;padding:3px 4px!important;right:2px!important;bottom:3px!important}
#fullcards .full-opp-card{filter:drop-shadow(0 4px 7px rgba(0,0,0,.38))}
#fullcards .full-you-card{filter:drop-shadow(0 4px 7px rgba(0,0,0,.38))}
#full .h100-half-label{position:absolute;left:50%;transform:translateX(-50%);z-index:11;padding:3px 7px;border-radius:999px;background:rgba(24,20,17,.5);color:rgba(235,220,196,.55);font:800 7px/1 ui-monospace,Menlo,monospace;letter-spacing:.12em;pointer-events:none}
#full .h100-half-label.opp{top:27px}
#full .h100-half-label.you{top:calc(50% + 8px)}
@media(max-width:390px){#fullcards .card{width:70px!important}#full .life-heart[data-life="opp"],#full .life-heart[data-life="you"]{top:calc(50% - 25px)!important}}
</style>`;
  out=out.replace('</head>',css+'</head>');
  out=out.replace('<div id="fullcards"></div></section>','<div class="h100-half-label opp">OPPONENT</div><div class="h100-half-label you">YOUR SIDE</div><div id="fullcards"></div></section>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h99.fetch(request,env,ctx);
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
