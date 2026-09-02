import h85 from './worker-h85.js';

const BUILD='H86';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function replaceBlock(source,startToken,endToken,replacement){
  const start=source.indexOf(startToken);
  const end=source.indexOf(endToken,start);
  if(start<0||end<0)return source;
  return source.slice(0,start)+replacement+source.slice(end);
}

function transformApp(source){
  let out=source;

  out=replaceBlock(out,'function mulligan(){','function untapAll(){',`let mulliganBusy=false;
function mulligan(){
  if(mulliganBusy||!mulliganLibraryIds.length)return;
  mulliganBusy=true;
  const button=$('#mulligan');
  if(button){button.disabled=true;button.textContent='Mulligan…'}

  // Let Safari completely finish the button tap before rebuilding any card DOM.
  setTimeout(()=>{
    try{
      st.hand=[];st.scry=[];st.field=[];st.discard=[];st.exile=[];st.deckFlipped=false;
      st.deck=[...mulliganLibraryIds];
      st.cmd=[...mulliganCommanderIds];
      st.tokens=[...mulliganTokenIds];

      for(const id of st.deck){
        const c=st.cards[id];if(!c)continue;
        c.zone='deck';c.faceDown=true;c.tap=false;c.p1=0;c.p=null;c.t=null;c.stateIndex=0;c.x=40;c.y=40;
      }
      for(const id of st.cmd){
        const c=st.cards[id];if(!c)continue;
        c.zone='cmd';c.faceDown=false;c.tap=false;c.p1=0;c.p=null;c.t=null;c.stateIndex=0;c.x=40;c.y=40;
      }
      for(const id of st.tokens){
        const c=st.cards[id];if(!c)continue;
        c.zone='tokens';c.faceDown=false;c.tap=false;c.p1=0;c.p=null;c.t=null;c.stateIndex=0;c.x=40;c.y=40;
      }

      shuffle(st.deck);syncDeckFaces();
      for(let i=0;i<7&&st.deck.length;i++){
        const id=st.deck.shift(),c=st.cards[id];
        c.zone='hand';c.faceDown=false;c.tap=false;st.hand.push(id);
      }

      preview=null;deckPreviewReveal=false;selectedHand=null;boardZoomCard=null;
      const bz=$('#boardzoom');if(bz){bz.classList.remove('on');bz.querySelector('img')?.removeAttribute('src')}
      $('#inspect')?.classList.remove('on');$('#deckctrl')?.classList.remove('on');
      const deckOverlay=$('#deckoverlay');if(deckOverlay)deckOverlay.classList.remove('on');

      // Keep Hand closed during the reset. This avoids the Hand Mutation/Resize
      // observers doing layout work while the Mulligan click is still settling.
      const hand=$('#hand');if(hand){hand.classList.remove('open');hand.classList.add('closed')}
      const closeButton=$('#closehand');if(closeButton){closeButton.textContent='Open';closeButton.setAttribute('aria-expanded','false')}

      requestAnimationFrame(()=>{
        render();
        requestAnimationFrame(()=>{
          mulliganBusy=false;
          if(button){button.disabled=false;button.textContent='Mulligan'}
        });
      });
    }catch(err){
      console.error('Mulligan failed',err);
      mulliganBusy=false;
      if(button){button.disabled=false;button.textContent='Mulligan'}
    }
  },50);
}
`);

  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h85.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H85','H86').replaceAll('h85-','h86-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
