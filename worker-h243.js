import h242 from './worker-h242.js';

const BUILD='H243';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H243_NO_CARD_TO_CARD_SNAP'))return out;

  const helper=`
/* H243_NO_CARD_TO_CARD_SNAP
   Battlefield cards should stay exactly where the player releases them. The
   only magnetic behavior belongs to the five pile/zone targets, which use their
   own snap/zone-hit logic and are intentionally left untouched. Disable only the
   three card-to-card overlap snap helpers used by Your Side, Opponent, and Full
   Board placement paths. */
snapFieldPosition=(...args)=>null;
h117SnapFieldPosition=(...args)=>null;
h228SnapOpponentDedicated=(...args)=>null;
`;
  out=out.replace('function render(){',helper+'\nfunction render(){');
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h243-no-card-to-card-snap'))return out;
  out=out.replace('</body>','\n<!-- h243-no-card-to-card-snap -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h242.fetch(request,env,ctx);
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
