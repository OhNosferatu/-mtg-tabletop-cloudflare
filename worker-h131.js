import h130 from './worker-h130.js';

const BUILD='H131';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source;
  if(out.includes('h131-live-ui-sync'))return out;

  /* The large top status banner is not .hand-build; it is older diagnostic text
     that stopped advancing after H125. Update only those human-readable strings
     server-side, without renaming any JS APIs or gesture identifiers. */
  out=out.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
         .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);

  const css=`<style id="h131-counter-font-sync-style">
/* Your Side/Opponent inherit the exact Full Board counter typography through
   variables measured from a Full Board badge at runtime. The 8px values are a
   safe fallback matching the established Full Board counter treatment. */
:root{
  --h131-counter-font-size:8px;
  --h131-counter-line-height:1;
  --h131-counter-font-weight:1000;
  --h131-counter-letter-spacing:normal;
}
#field .card .badge,
#field .card .badge *,
#oppcards .card .badge,
#oppcards .card .badge *{
  font-size:var(--h131-counter-font-size)!important;
  line-height:var(--h131-counter-line-height)!important;
  font-weight:var(--h131-counter-font-weight)!important;
  letter-spacing:var(--h131-counter-letter-spacing)!important;
  -webkit-text-size-adjust:100%!important;
  text-size-adjust:100%!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h131-live-ui-sync">window.addEventListener('DOMContentLoaded',()=>{
    let current='${BUILD}',queued=false;

    const fixVisibleBuildText=()=>{
      document.querySelectorAll('.hand-build').forEach(el=>{if(el.textContent!==current)el.textContent=current});
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      let node;
      while((node=walker.nextNode())){
        const parent=node.parentElement;
        if(!parent||/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(parent.tagName))continue;
        const value=node.nodeValue||'';
        if(!/(MTG TableTop|Game loaded)/i.test(value))continue;
        const next=value.replace(/H\d+/g,current);
        if(next!==value)node.nodeValue=next;
      }
      document.documentElement.dataset.mtgBuild=current;
      window.MTG_BUILD=current;
    };

    const getFullBoardTypography=()=>{
      let badge=document.querySelector('#fullcards .card .badge');
      let probeCard=null;
      if(!badge){
        const root=document.getElementById('fullcards');
        if(root){
          probeCard=document.createElement('div');
          probeCard.className='card full-mini-card full-you-card h117-full-card';
          probeCard.style.cssText='position:absolute;visibility:hidden;pointer-events:none;left:-9999px;top:-9999px';
          badge=document.createElement('div');
          badge.className='badge counter-total';
          badge.textContent='4/4';
          probeCard.appendChild(badge);root.appendChild(probeCard);
        }
      }
      if(!badge)return null;
      const cs=getComputedStyle(badge);
      const data={fontSize:cs.fontSize||'8px',lineHeight:cs.lineHeight||'1',fontWeight:cs.fontWeight||'1000',letterSpacing:cs.letterSpacing||'normal'};
      probeCard?.remove();
      return data;
    };

    const syncCounterTypography=()=>{
      const t=getFullBoardTypography();if(!t)return;
      const root=document.documentElement;
      root.style.setProperty('--h131-counter-font-size',t.fontSize);
      root.style.setProperty('--h131-counter-line-height',t.lineHeight);
      root.style.setProperty('--h131-counter-font-weight',t.fontWeight);
      root.style.setProperty('--h131-counter-letter-spacing',t.letterSpacing);
      for(const el of document.querySelectorAll('#field .card .badge,#field .card .badge *,#oppcards .card .badge,#oppcards .card .badge *')){
        el.style.setProperty('font-size',t.fontSize,'important');
        el.style.setProperty('line-height',t.lineHeight,'important');
        el.style.setProperty('font-weight',t.fontWeight,'important');
        el.style.setProperty('letter-spacing',t.letterSpacing,'important');
      }
    };

    const apply=()=>{queued=false;fixVisibleBuildText();syncCounterTypography()};
    const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(apply)};

    new MutationObserver(queue).observe(document.body,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',queue,true);
    window.addEventListener('pageshow',queue);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});
    fetch('/api/health?from='+Date.now(),{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(d=>{if(d?.build)current=String(d.build);queue()})
      .catch(()=>{});
    queue();setTimeout(queue,80);setTimeout(queue,300);setTimeout(queue,900);
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

async function pageDebug(request,env,ctx){
  const u=new URL(request.url);u.pathname='/index.html';u.search='?h131probe='+Date.now();
  const upstream=await h130.fetch(new Request(u.toString(),{method:'GET',headers:request.headers}),env,ctx);
  const text=await upstream.text();
  const stale=(text.match(/H125/g)||[]).length;
  const i=Math.max(text.indexOf('MTG TableTop'),text.indexOf('Game loaded'));
  return new Response(JSON.stringify({ok:true,build:BUILD,upstreamStatus:upstream.status,upstreamHeaderBuild:upstream.headers.get('x-mtg-build'),staleH125Occurrences:stale,statusTextSnippet:i>=0?text.slice(Math.max(0,i-180),i+420):null,hasH130FontParity:text.includes('h130-counter-font-parity')},null,2),{status:200,headers:headers('application/json; charset=utf-8')});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    if(url.pathname==='/api/page-debug')return pageDebug(request,env,ctx);
    const response=await h130.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
