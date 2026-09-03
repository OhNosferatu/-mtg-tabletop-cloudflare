import h186 from './worker-h186.js';

const BUILD='H187';
const DIVIDER=58;
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h187-direct-mirror-piles'))return out;

  const script=`<script id="h187-direct-mirror-piles">window.addEventListener('DOMContentLoaded',()=>{
    const content=document.getElementById('h105fullcontent');
    if(!content)return;

    /* Player side remains the H186 stable order. The opponent side becomes the
       direct vertical mirror of that player column around the center of one
       battlefield: player Commander->Exile->Deck->Graveyard->Tokens becomes
       opponent Tokens->Graveyard->Deck->Exile->Commander. */
    const youOrder={cmd:.135,exile:.30,deck:.465,graveyard:.63,tokens:.795};
    const oppOrder={};
    for(const [zone,f] of Object.entries(youOrder))oppOrder[zone]=1-f;

    const layout=()=>{
      const totalH=content.clientHeight;if(!totalH)return;
      const boardH=Math.max(1,(totalH-${DIVIDER})/2);
      const place=(owner,map,base)=>{
        const layer=document.getElementById('h116-piles-'+owner);if(!layer)return;
        for(const [zone,f] of Object.entries(map)){
          layer.querySelectorAll('[data-h117-zone="'+zone+'"]').forEach(el=>{
            el.style.setProperty('top',(base+boardH*f)+'px','important');
            el.style.setProperty('left','1.4%','important');
            el.style.setProperty('translate','none','important');
            el.style.setProperty('transform','none','important');
            if(zone==='graveyard')el.dataset.name='GRAVEYARD';
          });
        }
      };
      place('opp',oppOrder,0);
      place('you',youOrder,boardH+${DIVIDER});
    };

    requestAnimationFrame(layout);setTimeout(layout,80);setTimeout(layout,180);
    window.addEventListener('pageshow',layout);
    window.addEventListener('orientationchange',()=>setTimeout(layout,100),{passive:true});
    window.addEventListener('resize',layout,{passive:true});
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h186.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
