import h124 from './worker-h124.js';

const BUILD='H125';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function replaceBlock(source,startToken,endToken,replacement){
  const start=source.indexOf(startToken);
  const end=source.indexOf(endToken,start);
  if(start<0||end<0)return source;
  return source.slice(0,start)+replacement+source.slice(end);
}

function transformCounterUi(source){
  if(source.includes('H125_COMBINED_BOARD_COUNTERS'))return source;
  let out=source;
  out=replaceBlock(out,'  function renderBoardCard(id){','  function renderAllNow(){',`  /* H125_COMBINED_BOARD_COUNTERS
     Full-card inspection keeps +1/+1 and X/X as separate concepts, but every
     battlefield view shows one final power/toughness result. */
  function renderBoardCard(id){
    const hasCounter=counters.has(id);
    const counter=hasCounter?(counters.get(id)??0):0;
    const base=bases.get(id);
    for(const card of cardEls(id)){
      let badge=card.querySelector('.badge');
      if(!hasCounter&&!base){
        if(badge?.classList.contains('counter-total')||badge?.classList.contains('counter-stack'))badge.remove();
        continue;
      }
      if(!badge){
        badge=document.createElement('div');
        badge.className='badge';
        card.appendChild(badge);
      }
      badge.classList.remove('counter-stack');
      badge.classList.add('counter-total');
      badge.style.pointerEvents='none';
      badge.setAttribute('aria-hidden','true');

      let text='';
      if(base){
        text=(base.p+counter)+'/'+(base.t+counter);
      }else{
        text=fmtCounter(counter);
      }
      if(badge.textContent!==text)badge.textContent=text;
    }
  }

`);
  return out;
}

function transformHtml(source){
  let out=source.replaceAll('H124','H125');
  if(out.includes('h125-counter-display-style'))return out;
  const css=`<style id="h125-counter-display-style">
/* H125: Your Side, Opponent and Full Board use the same exact battlefield
   counter badge. This intentionally adopts the larger, clearer Full Board
   typography rather than the older tiny #field counter-stack treatment. */
#field .card .badge.counter-total,
#oppcards .card .badge.counter-total,
#fullcards .card .badge.counter-total,
#fullcards .full-mini-card .badge.counter-total,
#fullcards .full-you-card .badge.counter-total,
#fullcards .full-opp-card .badge.counter-total{
  right:1px!important;
  bottom:1px!important;
  min-width:0!important;
  max-width:none!important;
  height:auto!important;
  padding:2px 3px!important;
  border-radius:4px!important;
  border-width:1px!important;
  background:rgba(21,17,15,.9)!important;
  color:#fff!important;
  box-shadow:0 1px 3px #0008!important;
  font-size:8px!important;
  font-weight:1000!important;
  line-height:1!important;
  white-space:nowrap!important;
  display:block!important;
}

/* Retire the split miniature-board styling once H125 has converted a badge. */
#field .card .badge.counter-total .counter-line,
#field .card .badge.counter-total .base-line,
#oppcards .card .badge.counter-total .counter-line,
#oppcards .card .badge.counter-total .base-line,
#fullcards .card .badge.counter-total .counter-line,
#fullcards .card .badge.counter-total .base-line{font-size:inherit!important;border:0!important;margin:0!important;padding:0!important}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h124.fetch(request,env,ctx);
    if(url.pathname==='/counter-ui.js'){
      const text=await response.text();
      return new Response(transformCounterUi(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
