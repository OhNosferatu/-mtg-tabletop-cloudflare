import h235 from './worker-h235.js';

const BUILD='H236';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H236_OPPONENT_NATIVE_CARD_ELEMENT'))return out;

  const helper=`
/* H236_OPPONENT_NATIVE_CARD_ELEMENT
   Dedicated Opponent cards were still created through cardEl(c,false), whose
   legacy onclick opens the viewer immediately. Full Board already clears that
   onclick before H124 owns tap/double-tap/long-press, while #oppcards did not.
   Remove only that legacy click handler so the dedicated Opponent battlefield
   uses the exact same H124 gesture owner as the other battlefield views. */
function h236OpponentCardEl(c){
  const d=cardEl(c,false);
  d.onclick=null;
  return d;
}
`;
  out=out.replace('function render(){',helper+'\nfunction render(){');
  out=out.replace(
    "st.opp.forEach(id=>o.appendChild(cardEl(st.cards[id],false)));",
    "st.opp.forEach(id=>o.appendChild(h236OpponentCardEl(st.cards[id])));"
  );
  return out;
}

function transformHtml(source){return stamp(source)}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h235.fetch(request,env,ctx);
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
