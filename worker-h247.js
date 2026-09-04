import h244 from './worker-h244.js';

const BUILD='H247';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H247_FULLBOARD_DIRECT_DROP_PARITY'))return out;

  /* H211 changed Full Board card drops to route through h211PlaceField using the
     POINTER position. That means H244's drag-ghost-center fix never reached the
     Full Board path, even though it fixed Your Side and dedicated Opponent.
     Route Full Board through the same visual-center coordinates, and make the
     mode='full' placement branch write coordinates directly with no snap helper. */
  out=out.replace(
    "h211PlaceField(c,targetOwner,x,y,'full');render();return;",
    "h211PlaceField(c,targetOwner,dropX,dropY,'full');render();return;/* H247_FULLBOARD_DIRECT_DROP_PARITY */"
  );

  const oldFull=`  if(mode==='full'){
    h117SetFieldPosition(c,targetOwner,x,y,null);
    c.tap=tapped;
    return true;
  }`;
  const newFull=`  if(mode==='full'){
    /* H247_FULLBOARD_DIRECT_DROP_PARITY
       This is the exact dedicated-board placement model: use the visual card
       center supplied by H244, convert directly into the destination battlefield
       plane, clamp only to the board edges, and never invoke card-to-card snap. */
    if(targetOwner==='opp')h117OppPut(c.id,'field');else putInZone(c.id,'field');
    const r=h117HalfRect(targetOwner);if(!r||!r.width||!r.height)return false;
    const size=fieldCardSize();
    c.x=Math.max(0,Math.min(100-size.w/r.width*100,(x-r.left-size.w/2)/r.width*100));
    c.y=Math.max(0,Math.min(100-size.h/r.height*100,(y-r.top-size.h/2)/r.height*100));
    h117BringFront(c.id,targetOwner);c.tap=tapped;
    return true;
  }`;
  out=out.replace(oldFull,newFull);
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h247-fullboard-direct-drop-parity'))return out;
  out=out.replace('</body>','\n<!-- h247-fullboard-direct-drop-parity -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    /* Build from H244 directly. H245/H246 were aimed at the old Full Board drop
       call and did not address H211's actual pointer-centered placement route. */
    const response=await h244.fetch(request,env,ctx);
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
