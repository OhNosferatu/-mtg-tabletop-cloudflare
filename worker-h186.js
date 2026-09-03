import h184 from './worker-h184.js';

const BUILD='H186';
const DIVIDER=58;
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h186-measured-pile-layout'))return out;

  const css=`<style id="h186-measured-pile-layout-style">
/* H186 keeps H184 as the baseline. Pile coordinates are applied in measured
   pixels at runtime, so no older 200%-layer percentages or translations can
   mix the player and opponent columns together. */
#h116-piles-opp,#h116-piles-you{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  min-height:0!important;
  max-height:none!important;
  translate:none!important;
  transform:none!important;
  pointer-events:none!important;
}
#h116-piles-opp>[data-h117-zone],#h116-piles-you>[data-h117-zone]{
  position:absolute!important;
  left:1.4%!important;
  right:auto!important;
  margin:0!important;
  translate:none!important;
  transform:none!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h186-measured-pile-layout">window.addEventListener('DOMContentLoaded',()=>{
    const content=document.getElementById('h105fullcontent');
    if(!content)return;

    const oppOrder={tokens:.135,graveyard:.30,deck:.465,exile:.63,cmd:.795};
    const youOrder={cmd:.135,exile:.30,deck:.465,graveyard:.63,tokens:.795};

    const layout=()=>{
      const totalH=content.clientHeight;
      if(!totalH)return;
      const boardH=Math.max(1,(totalH-${DIVIDER})/2);
      const place=(owner,map,base)=>{
        const layer=document.getElementById('h116-piles-'+owner);if(!layer)return;
        layer.style.setProperty('height',totalH+'px','important');
        layer.style.setProperty('translate','none','important');
        layer.style.setProperty('transform','none','important');
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
    const response=await h184.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
