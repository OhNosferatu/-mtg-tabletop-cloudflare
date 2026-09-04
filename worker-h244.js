import h243 from './worker-h243.js';

const BUILD='H244';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H244_PRESERVE_DRAG_RELEASE_POSITION'))return out;

  /* H124 historically forwarded only the finger coordinates on drop. The field
     placement helpers interpret those coordinates as the CARD CENTER, so a card
     jumps toward the finger on pointerup whenever it was grabbed off-center.
     Keep pointer x/y for hand/pile hit testing, but accept the visual drag-ghost
     center separately for the final battlefield position. */
  out=out.replace(
    "async function h124CardGestureAction(id,owner,action,x=0,y=0){",
    "async function h124CardGestureAction(id,owner,action,x=0,y=0,dropX=x,dropY=y){/* H244_PRESERVE_DRAG_RELEASE_POSITION */"
  );
  out=out.replace(
    "h117SetFieldPosition(c,owner,x,y,null);render();return;",
    "h117SetFieldPosition(c,owner,dropX,dropY,null);render();return;"
  );
  out=out.replace(
    "if(r&&pointInRect(x,y,r)){placeOnField(id,x,y,null);render();return}",
    "if(r&&pointInRect(x,y,r)){placeOnField(id,dropX,dropY,null);render();return}"
  );
  out=out.replace(
    "c.x=Math.max(0,Math.min(100-size.w/r.width*100,(x-r.left-size.w/2)/r.width*100));\n      c.y=Math.max(0,Math.min(100-size.h/r.height*100,(y-r.top-size.h/2)/r.height*100));",
    "c.x=Math.max(0,Math.min(100-size.w/r.width*100,(dropX-r.left-size.w/2)/r.width*100));\n      c.y=Math.max(0,Math.min(100-size.h/r.height*100,(dropY-r.top-size.h/2)/r.height*100));"
  );
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h244-preserve-drag-release-position'))return out;

  out=out.replace(
    "const api=(id,owner,action,x,y)=>window.MTG_H124_cardGesture?.(id,owner,action,x,y);",
    "const api=(id,owner,action,x,y,dropX=x,dropY=y)=>window.MTG_H124_cardGesture?.(id,owner,action,x,y,dropX,dropY);"
  );

  const oldPointerUp=`    document.addEventListener('pointerup',e=>{\n      const g=gesture;if(!g||e.pointerId!==g.pid)return;\n      e.preventDefault();e.stopImmediatePropagation();\n      clearTimeout(g.holdTimer);\n      const wasLong=g.long,moved=g.moved,cancelled=g.cancelled,id=g.id,owner=g.owner,x=e.clientX,y=e.clientY;\n      cleanup();\n      if(wasLong){if(moved)api(id,owner,'drop',x,y);return}\n      if(cancelled)return;\n      finishTap({id,owner},x,y);\n    },true);`;
  const newPointerUp=`    document.addEventListener('pointerup',e=>{\n      const g=gesture;if(!g||e.pointerId!==g.pid)return;\n      e.preventDefault();e.stopImmediatePropagation();\n      clearTimeout(g.holdTimer);\n      const wasLong=g.long,moved=g.moved,cancelled=g.cancelled,id=g.id,owner=g.owner,x=e.clientX,y=e.clientY;\n      /* h244-preserve-drag-release-position\n         The ghost is exactly where the card appears while dragging. Capture its\n         visual center BEFORE cleanup removes it, then commit that center instead\n         of re-centering the card beneath the finger. This preserves the original\n         grab offset and removes the release-time jump seen in the screen recording. */\n      const dropRect=wasLong&&moved?g.ghost?.getBoundingClientRect():null;\n      const dropX=dropRect?dropRect.left+dropRect.width/2:x;\n      const dropY=dropRect?dropRect.top+dropRect.height/2:y;\n      cleanup();\n      if(wasLong){if(moved)api(id,owner,'drop',x,y,dropX,dropY);return}\n      if(cancelled)return;\n      finishTap({id,owner},x,y);\n    },true);`;
  out=out.replace(oldPointerUp,newPointerUp);
  out=out.replace('</body>','\n<!-- h244-preserve-drag-release-position -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h243.fetch(request,env,ctx);
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
