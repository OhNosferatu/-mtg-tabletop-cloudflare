import h210 from './worker-h210.js';

const BUILD='H211';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H211_CROSS_OWNER_FIELD_TRANSFER'))return out;

  const helper=`
/* H211_CROSS_OWNER_FIELD_TRANSFER
   A battlefield card may change controller simply by being dropped on the
   other player's battlefield. Remove it from both public-owner collections
   before adding it to the destination so a card can never exist on both sides. */
function h211DetachCard(id){
  removeFromAll(id);
  h117OppRemove(id);
}
function h211TransferPreserve(c,targetOwner){
  if(!c)return false;
  const x=c.x,y=c.y,tapped=!!c.tap;
  h211DetachCard(c.id);
  c.meta=c.meta||{};c.meta.h117Owner=targetOwner;
  if(targetOwner==='opp')h117OppPut(c.id,'field');else putInZone(c.id,'field');
  c.x=x;c.y=y;c.tap=tapped;
  return true;
}
function h211PlaceField(c,targetOwner,x,y,mode='full'){
  if(!c)return false;
  const tapped=!!c.tap;
  h211DetachCard(c.id);
  c.meta=c.meta||{};c.meta.h117Owner=targetOwner;

  if(mode==='full'){
    h117SetFieldPosition(c,targetOwner,x,y,null);
    c.tap=tapped;
    return true;
  }

  if(targetOwner==='opp'){
    h117OppPut(c.id,'field');
    const r=$('#oppcards')?.getBoundingClientRect()||$('#board')?.getBoundingClientRect();
    if(!r||!r.width||!r.height)return false;
    const size=fieldCardSize();
    c.x=Math.max(0,Math.min(100-size.w/r.width*100,(x-r.left-size.w/2)/r.width*100));
    c.y=Math.max(0,Math.min(100-size.h/r.height*100,(y-r.top-size.h/2)/r.height*100));
    h117SnapFieldPosition(c,'opp');h117BringFront(c.id,'opp');c.tap=tapped;
    return true;
  }

  putInZone(c.id,'field');
  const r=fieldRect();if(!r||!r.width||!r.height)return false;
  const size=fieldCardSize();
  c.x=Math.max(0,Math.min(100-size.w/r.width*100,(x-r.left-size.w/2)/r.width*100));
  c.y=Math.max(0,Math.min(100-size.h/r.height*100,(y-r.top-size.h/2)/r.height*100));
  snapFieldPosition(c,c.id);bringFront(c.id);c.tap=tapped;
  return true;
}
`;
  out=out.replace('function render(){',helper+'\nfunction render(){');

  /* H124 previously constrained a Full Board drag to the card's current owner.
     Choose the destination from the half under the pointer instead. */
  out=out.replace(
`    const r=h117HalfRect(owner);
    if(r&&pointInRect(x,y,r)){
      h117SetFieldPosition(c,owner,x,y,null);render();return;
    }
    render();return;`,
`    const oppR=h117HalfRect('opp'),youR=h117HalfRect('you');
    const targetOwner=oppR&&pointInRect(x,y,oppR)?'opp':(youR&&pointInRect(x,y,youR)?'you':null);
    if(targetOwner){
      h211PlaceField(c,targetOwner,x,y,'full');render();return;
    }
    render();return;`
  );

  /* Dedicated board views cannot show both fields at once. Dropping a long-
     pressed battlefield card on the opposite tab transfers control while
     preserving its relative battlefield position, then opens that side. */
  out=out.replace(
`  if(owner==='you'){
    if(handHit(x,y)){await moveToHandAt(id,x);return}`,
`  if(st.view!=='full'){
    const transferTab=owner==='you'?document.querySelector('[data-v="opp"]'):document.querySelector('[data-v="you"]');
    if(transferTab&&pointInRect(x,y,transferTab.getBoundingClientRect())){
      h211TransferPreserve(c,owner==='you'?'opp':'you');render();
      requestAnimationFrame(()=>transferTab.click());return;
    }
  }

  if(owner==='you'){
    if(handHit(x,y)){await moveToHandAt(id,x);return}`
  );

  /* The hand's original drop handler knew only the dedicated player field.
     Teach it the Full Board halves and the dedicated Opponent battlefield. */
  out=out.replace(
`const fr=fieldRect();if(pointInRect(e.clientX,e.clientY,fr)&&!handHit(e.clientX,e.clientY)){placeOnField(id,e.clientX,e.clientY,false);render();return}render();return`,
`const fr=fieldRect();
 if(st.view==='full'){
  const oppR=h117HalfRect('opp'),youR=h117HalfRect('you');
  if(oppR&&pointInRect(e.clientX,e.clientY,oppR)&&!handHit(e.clientX,e.clientY)){c.faceDown=false;h211PlaceField(c,'opp',e.clientX,e.clientY,'full');render();return}
  if(youR&&pointInRect(e.clientX,e.clientY,youR)&&!handHit(e.clientX,e.clientY)){c.faceDown=false;h211PlaceField(c,'you',e.clientX,e.clientY,'full');render();return}
 }
 if(st.view==='opp'){
  const oppR=$('#oppcards')?.getBoundingClientRect()||$('#board')?.getBoundingClientRect();
  if(oppR&&pointInRect(e.clientX,e.clientY,oppR)&&!handHit(e.clientX,e.clientY)){c.faceDown=false;h211PlaceField(c,'opp',e.clientX,e.clientY,'opp');render();return}
 }
 const oppTab=document.querySelector('[data-v="opp"]');
 if(st.view==='you'&&oppTab&&pointInRect(e.clientX,e.clientY,oppTab.getBoundingClientRect())){c.faceDown=false;h211TransferPreserve(c,'opp');render();requestAnimationFrame(()=>oppTab.click());return}
 if(pointInRect(e.clientX,e.clientY,fr)&&!handHit(e.clientX,e.clientY)){placeOnField(id,e.clientX,e.clientY,false);render();return}render();return`
  );

  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h211-cross-owner-field-transfer'))return out;

  const css=`<style id="h211-cross-owner-field-transfer-style">
/* The player's hand remains private, but keep their own hand drawer available
   while inspecting the dedicated Opponent board so a card can be placed there. */
body.h157-opp-mode #hand{display:block!important}
</style>`;
  out=out.replace('</head>',css+'</head>');
  const marker='\n<!-- h211-cross-owner-field-transfer -->\n';
  out=out.replace('</body>',marker+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h210.fetch(request,env,ctx);
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
