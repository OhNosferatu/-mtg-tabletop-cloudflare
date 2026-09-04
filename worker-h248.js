import h247 from './worker-h247.js';

const BUILD='H248';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H248_FULLBOARD_STATE_TRANSFER_PARITY'))return out;

  const helper=`
/* H248_FULLBOARD_STATE_TRANSFER_PARITY
   Full Board pile/field interactions must MOVE the real card id, never leave a
   second reference behind in the source pile. H247 fixed visual placement; H248
   makes the state transfer authoritative for deck/commander/tokens/other piles
   and for field -> pile moves. */
const h248OriginalOppRemove=h117OppRemove;
h117OppRemove=function(id){
  const p=st.oppPublic||{};
  const wasDeck=Array.isArray(p.deck)&&p.deck.includes(id);
  h248OriginalOppRemove(id);
  if(wasDeck)p.deckCount=Math.max(0,(Number(p.deckCount)||0)-1);
};

h117SetFieldPosition=function(c,owner,x,y,faceDown=null){
  if(!c)return;
  const r=h117HalfRect(owner);if(!r||!r.width||!r.height)return;

  /* Remove the id from every possible source before adding it to the field. */
  h211DetachCard(c.id);
  c.meta=c.meta||{};c.meta.h117Owner=owner;
  if(owner==='opp')h117OppPut(c.id,'field');else putInZone(c.id,'field');
  if(faceDown!==null)c.faceDown=faceDown;

  const size=fieldCardSize();
  c.x=Math.max(0,Math.min(100-size.w/r.width*100,(x-r.left-size.w/2)/r.width*100));
  c.y=Math.max(0,Math.min(100-size.h/r.height*100,(y-r.top-size.h/2)/r.height*100));
  h117BringFront(c.id,owner);
};

h117MoveToZone=async function(id,owner,zone){
  const c=st.cards[id];if(!c)return;

  /* A zone drop is also a move, not a copy. Detach first so the source field or
     hand cannot keep rendering the same id after the pile accepts it. */
  h211DetachCard(id);
  c.meta=c.meta||{};c.meta.h117Owner=owner;
  c.tap=false;

  if(owner==='opp'){
    h117OppPut(id,zone,zone==='deck');
    if(zone!=='deck'&&!c.img)await load(c);
    render();return;
  }

  putInZone(id,zone,zone==='deck');
  if(zone==='deck')c.faceDown=!st.deckFlipped;
  else{
    c.faceDown=false;
    if(!c.img)await load(c);
  }
  render();
};
`;

  out=out.replace('function render(){',helper+'\nfunction render(){');
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h248-fullboard-state-transfer-parity'))return out;
  out=out.replace('</body>','\n<!-- h248-fullboard-state-transfer-parity -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h247.fetch(request,env,ctx);
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
