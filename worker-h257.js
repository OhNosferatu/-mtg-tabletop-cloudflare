import h256 from './worker-h256.js';

const BUILD='H257';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H257_FULLBOARD_EMPTY_DECK_SLOT'))return out;

  const helper=`
/* H257_FULLBOARD_EMPTY_DECK_SLOT
   An empty deck is still a real board zone. H256 correctly removed phantom card
   artwork, but Full Board must retain the physical outlined deck target on both
   halves even when its count is zero. Do not create a fake card; keep the H117
   pile element and its count/geometry alive. */
function h257SyncFullDeckSlots(){
  const publicOpp=st.oppPublic||{};
  const counts={
    you:Array.isArray(st.deck)?st.deck.length:0,
    opp:Math.max(Number(publicOpp.deckCount)||0,Array.isArray(publicOpp.deck)?publicOpp.deck.length:0)
  };

  /* H117 normally creates all five slots on every render. If an older mirror
     refresh removed one, rebuild the canonical Full Board pile layers once. */
  let youDeck=document.querySelector('#h116-piles-you [data-h117-zone="deck"],#h116-piles-you .h116-deck');
  let oppDeck=document.querySelector('#h116-piles-opp [data-h117-zone="deck"],#h116-piles-opp .h116-deck');
  if(!youDeck||!oppDeck){
    try{h117RenderFullPiles()}catch{}
    youDeck=document.querySelector('#h116-piles-you [data-h117-zone="deck"],#h116-piles-you .h116-deck');
    oppDeck=document.querySelector('#h116-piles-opp [data-h117-zone="deck"],#h116-piles-opp .h116-deck');
  }

  for(const [owner,el] of [['you',youDeck],['opp',oppDeck]]){
    if(!el)continue;
    const count=counts[owner];
    el.classList.add('zone','deck','h116-pile','h116-deck','h117-pile');
    el.dataset.name='DECK';el.dataset.h117Zone='deck';
    el.classList.toggle('empty',count<=0);
    let badge=el.querySelector(':scope>.count');
    if(!badge){badge=document.createElement('span');badge.className='count';el.appendChild(badge)}
    badge.textContent=String(count);
    if(count<=0)el.querySelectorAll(':scope>img').forEach(img=>img.remove());
  }
}
window.MTG_H257_syncFullDeckSlots=h257SyncFullDeckSlots;

/* Run after the final inherited render wrapper so H252/H254 can finish their
   normal canonical-state work first. This changes presentation only. */
const h257BaseRender=render;
render=function(){h257BaseRender();h257SyncFullDeckSlots()};
`;

  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+helper+'\n/* H257_FULLBOARD_EMPTY_DECK_SLOT_END */\n'+out.slice(end);
  else out+=helper;
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h257-fullboard-empty-deck-slot'))return out;

  const css=`<style id="h257-fullboard-empty-deck-slot-style">
/* Empty Full Board decks are outlined drop targets, not hidden piles. H205 still
   owns the blue/red border colors and H201/H203 still own exact positioning. */
#h116-piles-you .h116-deck.empty,
#h116-piles-opp .h116-deck.empty,
#h116-piles-you [data-h117-zone="deck"].empty,
#h116-piles-opp [data-h117-zone="deck"].empty{
  display:block!important;
  visibility:visible!important;
  opacity:1!important;
  border-width:2px!important;
  border-style:solid!important;
  background:rgba(120,150,118,.07)!important;
  pointer-events:auto!important;
}
#h116-piles-you .h116-deck.empty::before,
#h116-piles-opp .h116-deck.empty::before,
#h116-piles-you [data-h117-zone="deck"].empty::before,
#h116-piles-opp [data-h117-zone="deck"].empty::before{
  display:none!important;
  content:none!important;
  background:none!important;
}
#h116-piles-you .h116-deck.empty>img,
#h116-piles-opp .h116-deck.empty>img{display:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h257-fullboard-empty-deck-slot">window.addEventListener('DOMContentLoaded',()=>{
    const sync=()=>requestAnimationFrame(()=>window.MTG_H257_syncFullDeckSlots?.());
    document.querySelector('[data-v="full"]')?.addEventListener('click',sync);
    window.addEventListener('pageshow',sync);sync();setTimeout(sync,100);
  });</script>`;
  out=out.replace('</body>',script+'\n<!-- h257-fullboard-empty-deck-slot -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h256.fetch(request,env,ctx);
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
