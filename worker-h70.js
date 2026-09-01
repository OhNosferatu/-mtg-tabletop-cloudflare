import h69 from './worker-h69.js';

const BUILD='H70';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  return source.replace(
`  const top=deckVisibleCard();
  const revealBtn=z.querySelector('button[data-deck-action="reveal"]');
  if(revealBtn)revealBtn.textContent=top&&!top.faceDown?'Unreveal Card':'Reveal Top';`,
`  const top=deckVisibleCard();
  const revealBtn=z.querySelector('button[data-deck-action="reveal"]');
  if(revealBtn){
    const individuallyRevealed=!st.deckFlipped&&top&&!top.faceDown;
    revealBtn.textContent=individuallyRevealed?'Unreveal Card':'Reveal Top';
    revealBtn.disabled=!!st.deckFlipped;
  }
  const flipBtn=z.querySelector('button[data-deck-action="flipdeck"]');
  if(flipBtn)flipBtn.textContent=st.deckFlipped?'Unflip Deck':'Flip Deck';`
  );
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h69.fetch(request,env,ctx);

    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }

    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      const out=text.replaceAll('H69','H70').replaceAll('h69-','h70-');
      return new Response(out,{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }

    return response;
  }
};
