import h83 from './worker-h83.js';

const BUILD='H89';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  let out=source;
  if(out.includes('MTG_PENDING_MULLIGAN_H89'))return out;

  // Save the exact imported deck definition every time applyDeck succeeds.
  out=out.replace(
    'async function applyDeck(d){',
    `async function applyDeck(d){\n  try{sessionStorage.setItem('MTG_LAST_DECK_H89',JSON.stringify(d))}catch{}`
  );

  // Mulligan itself performs no state/DOM work. Safari simply tears down the
  // current page and starts clean, which guarantees every live player card,
  // drag handler, overlay and pointer state is destroyed.
  const mullStart=out.indexOf('async function mulligan(){');
  const mullEnd=out.indexOf('function untapAll(){',mullStart);
  if(mullStart>=0&&mullEnd>=0){
    out=out.slice(0,mullStart)+`function mulligan(){
  try{
    if(!sessionStorage.getItem('MTG_LAST_DECK_H89'))return;
    sessionStorage.setItem('MTG_PENDING_MULLIGAN_H89','1');
  }catch{return}
  location.reload();
}
`+out.slice(mullEnd);
  }

  // On the brand-new page, rebuild from the saved import, shuffle, deal seven,
  // and then show Hand. This runs after the original script has installed all UI
  // handlers, completely outside the Mulligan tap that occurred on the old page.
  const boot=`
async function restorePendingMulliganH89(){
  let pending='',raw='';
  try{pending=sessionStorage.getItem('MTG_PENDING_MULLIGAN_H89')||'';raw=sessionStorage.getItem('MTG_LAST_DECK_H89')||''}catch{return}
  if(pending!=='1'||!raw)return;
  try{sessionStorage.removeItem('MTG_PENDING_MULLIGAN_H89')}catch{}
  let d;try{d=JSON.parse(raw)}catch{return}
  if(!d)return;
  try{
    await applyDeck(d);
    shuffle(st.deck);syncDeckFaces();
    st.hand=[];
    for(let i=0;i<7&&st.deck.length;i++){
      const id=st.deck.shift(),c=st.cards[id];
      if(!c)continue;
      c.zone='hand';c.faceDown=false;c.tap=false;st.hand.push(id);
    }
    selectedHand=null;preview=null;deckPreviewReveal=false;
    render();
    const hand=$('#hand');if(hand){hand.classList.remove('closed');hand.classList.remove('open')}
    const closeButton=$('#closehand');if(closeButton){closeButton.textContent='Close';closeButton.setAttribute('aria-expanded','true')}
    requestAnimationFrame(()=>requestAnimationFrame(syncHandScroller));
    for(const id of [...st.hand]){
      const c=st.cards[id];if(!c||frontImage(c))continue;
      load(c).then(()=>{
        if(c.zone!=='hand')return;
        const el=document.querySelector('#handrow .hcard[data-id="'+c.id+'"]');if(!el)return;
        const src=displayImage(c)||'';if(!src)return;
        let img=el.querySelector('img');if(!img){img=document.createElement('img');img.draggable=false;el.insertBefore(img,el.firstChild)}
        img.setAttribute('src',src);el.querySelector('.cardname')?.remove();
      });
    }
  }catch(err){console.error('H89 Mulligan restore failed',err)}
}
setTimeout(restorePendingMulliganH89,0);
`;

  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+boot+out.slice(end);
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h83.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H83','H89').replaceAll('h83-','h89-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
