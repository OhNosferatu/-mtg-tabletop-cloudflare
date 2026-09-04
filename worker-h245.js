import h244 from './worker-h244.js';

const BUILD='H245';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H245_FULLBOARD_DRAG_DELTA'))return out;

  const helper=`
/* H245_FULLBOARD_DRAG_DELTA
   Dedicated boards were fixed in H244 by committing the visual ghost position.
   Full Board has an extra stacked-board/divider mapping, so rebuilding position
   from client coordinates can still introduce a small release jump. For Full
   Board only, preserve the exact drag translation instead: add the pointer's
   visual delta to the card's existing stored x/y coordinates. */
function h245CommitFullDragDelta(c,owner,dx,dy){
  const half=h117HalfRect(owner);if(!c||!half||!half.width||!half.height)return;
  const size=h118CardPixels();
  const maxX=Math.max(0,100-(size.w/half.width)*100);
  const maxY=Math.max(0,100-(size.h/half.height)*100);
  c.x=Math.max(0,Math.min(maxX,c.x+(dx/half.width)*100));
  c.y=Math.max(0,Math.min(maxY,c.y+(dy/half.height)*100));
  h117BringFront(c.id,owner);
}
`;
  out=out.replace('function render(){',helper+'\nfunction render(){');
  out=out.replace(
    "async function h124CardGestureAction(id,owner,action,x=0,y=0,dropX=x,dropY=y){/* H244_PRESERVE_DRAG_RELEASE_POSITION */",
    "async function h124CardGestureAction(id,owner,action,x=0,y=0,dropX=x,dropY=y,dragDX=0,dragDY=0){/* H244_PRESERVE_DRAG_RELEASE_POSITION *//* H245_FULLBOARD_DRAG_DELTA */"
  );
  out=out.replace(
    "h117SetFieldPosition(c,owner,dropX,dropY,null);render();return;",
    "h245CommitFullDragDelta(c,owner,dragDX,dragDY);render();return;"
  );
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h245-fullboard-drag-delta'))return out;

  out=out.replace(
    "const api=(id,owner,action,x,y,dropX=x,dropY=y)=>window.MTG_H124_cardGesture?.(id,owner,action,x,y,dropX,dropY);",
    "const api=(id,owner,action,x,y,dropX=x,dropY=y,dragDX=0,dragDY=0)=>window.MTG_H124_cardGesture?.(id,owner,action,x,y,dropX,dropY,dragDX,dragDY);"
  );
  out=out.replace(
    "const dropY=dropRect?dropRect.top+dropRect.height/2:y;\n      cleanup();\n      if(wasLong){if(moved)api(id,owner,'drop',x,y,dropX,dropY);return}",
    "const dropY=dropRect?dropRect.top+dropRect.height/2:y;\n      const dragDX=x-g.sx,dragDY=y-g.sy;\n      cleanup();\n      if(wasLong){if(moved)api(id,owner,'drop',x,y,dropX,dropY,dragDX,dragDY);return}"
  );
  out=out.replace('</body>','\n<!-- h245-fullboard-drag-delta -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
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
