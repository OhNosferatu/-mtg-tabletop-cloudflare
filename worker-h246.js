import h244 from './worker-h244.js';

const BUILD='H246';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H246_FULLBOARD_EXACT_GHOST_COMMIT'))return out;

  const helper=`
/* H246_FULLBOARD_EXACT_GHOST_COMMIT
   H243/H244 fixed the dedicated boards by removing card-to-card magnetic snap
   and committing the position that was actually shown while dragging. Full
   Board should follow that same rule. Do not rebuild a Full Board drop from the
   finger center or from a movement delta. Commit the drag ghost's exact top-left
   rectangle through the established one-to-one Full Board coordinate helper. */
function h246CommitFullGhostRect(c,owner,left,top,w,h){
  if(!c||!Number.isFinite(left)||!Number.isFinite(top)||!(w>0)||!(h>0))return;
  h118CommitFullTopLeft(c,owner,left,top,w,h);
  h117BringFront(c.id,owner);
}
`;
  out=out.replace('function render(){',helper+'\nfunction render(){');

  out=out.replace(
    "async function h124CardGestureAction(id,owner,action,x=0,y=0,dropX=x,dropY=y){/* H244_PRESERVE_DRAG_RELEASE_POSITION */",
    "async function h124CardGestureAction(id,owner,action,x=0,y=0,dropX=x,dropY=y,dropLeft=NaN,dropTop=NaN,dropW=0,dropH=0){/* H244_PRESERVE_DRAG_RELEASE_POSITION *//* H246_FULLBOARD_EXACT_GHOST_COMMIT */"
  );

  /* Replace only the Full Board battlefield commit. Hand and pile hit testing
     still uses the pointer coordinates exactly as before. H243's no-card-snap
     behavior remains active because H246 builds from H244 -> H243. */
  out=out.replace(
    "h117SetFieldPosition(c,owner,dropX,dropY,null);render();return;",
    "h246CommitFullGhostRect(c,owner,dropLeft,dropTop,dropW,dropH);render();return;"
  );
  return out;
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h246-fullboard-exact-ghost-commit'))return out;

  out=out.replace(
    "const api=(id,owner,action,x,y,dropX=x,dropY=y)=>window.MTG_H124_cardGesture?.(id,owner,action,x,y,dropX,dropY);",
    "const api=(id,owner,action,x,y,dropX=x,dropY=y,dropLeft=NaN,dropTop=NaN,dropW=0,dropH=0)=>window.MTG_H124_cardGesture?.(id,owner,action,x,y,dropX,dropY,dropLeft,dropTop,dropW,dropH);"
  );

  out=out.replace(
    "const dropY=dropRect?dropRect.top+dropRect.height/2:y;\n      cleanup();\n      if(wasLong){if(moved)api(id,owner,'drop',x,y,dropX,dropY);return}",
    "const dropY=dropRect?dropRect.top+dropRect.height/2:y;\n      const dropLeft=dropRect?dropRect.left:NaN,dropTop=dropRect?dropRect.top:NaN;\n      const dropW=dropRect?dropRect.width:0,dropH=dropRect?dropRect.height:0;\n      cleanup();\n      if(wasLong){if(moved)api(id,owner,'drop',x,y,dropX,dropY,dropLeft,dropTop,dropW,dropH);return}"
  );

  out=out.replace('</body>','\n<!-- h246-fullboard-exact-ghost-commit -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    /* Build directly from H244. H245's Full Board delta experiment is excluded;
       H246 instead uses the same exact-visual-position principle that fixed the
       dedicated Your Side and Opponent boards. */
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
