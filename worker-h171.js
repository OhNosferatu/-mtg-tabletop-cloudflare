import h170 from './worker-h170.js';

const BUILD='H171';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h171-inventory-drag-drop'))return out;

  /* Replace H164's tap-to-spawn behavior with direct drag placement. The token
     is created only after a real drag is released inside the player's visible
     battlefield (Your Side, or the lower player half of Full Board). */
  const oldClick="grid.addEventListener('click',e=>{const b=e.target.closest('[data-mana]');if(!b)return;addMana(b.dataset.mana)});";
  const dragCode=`
    /* H171 inventory drag/drop */
    const h171Inventory=document.getElementById('h162inventory');
    const h171DropRect=()=>{
      if(document.querySelector('[data-v="full"]')?.classList.contains('on'))return halfRect();
      if(document.querySelector('[data-v="you"]')?.classList.contains('on'))return document.getElementById('field')?.getBoundingClientRect()||null;
      return null;
    };
    const h171AddAt=(type,clientX,clientY)=>{
      const r=h171DropRect();if(!r||!r.width||!r.height)return false;
      if(clientX<r.left||clientX>r.right||clientY<r.top||clientY>r.bottom)return false;
      const D=32;
      const x=Math.max(0,Math.min(1,(clientX-r.left-D/2)/Math.max(1,r.width-D)));
      const y=Math.max(0,Math.min(1,(clientY-r.top-D/2)/Math.max(1,r.height-D)));
      tokens.push({id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),type,value:0,x,y});
      save();render();return true;
    };
    let h171Drag=null;
    const h171MoveGhost=(x,y)=>{if(h171Drag?.ghost){h171Drag.ghost.style.left=x+'px';h171Drag.ghost.style.top=y+'px'}};
    const h171Cleanup=()=>{
      if(!h171Drag)return;
      h171Drag.ghost?.remove();
      h171Inventory?.classList.remove('h171-dragging');
      document.body.classList.remove('h171-inventory-dragging');
      h171Drag=null;
    };
    grid.addEventListener('pointerdown',e=>{
      const b=e.target.closest('[data-mana]');if(!b)return;
      if(e.button!==undefined&&e.button!==0)return;
      e.preventDefault();e.stopPropagation();
      const preview=b.querySelector('.h164-mana-preview');
      const ghost=(preview||b).cloneNode(true);
      ghost.classList.add('h171-inventory-ghost');
      ghost.removeAttribute('id');
      document.body.appendChild(ghost);
      h171Drag={type:b.dataset.mana,pid:e.pointerId,sx:e.clientX,sy:e.clientY,moved:false,ghost};
      h171Inventory?.classList.add('h171-dragging');
      document.body.classList.add('h171-inventory-dragging');
      h171MoveGhost(e.clientX,e.clientY);
      try{b.setPointerCapture?.(e.pointerId)}catch{}
    });
    document.addEventListener('pointermove',e=>{
      if(!h171Drag||e.pointerId!==h171Drag.pid)return;
      if(Math.hypot(e.clientX-h171Drag.sx,e.clientY-h171Drag.sy)>10)h171Drag.moved=true;
      h171MoveGhost(e.clientX,e.clientY);
      e.preventDefault();
    },{passive:false});
    document.addEventListener('pointerup',e=>{
      if(!h171Drag||e.pointerId!==h171Drag.pid)return;
      const d=h171Drag;
      if(d.moved)h171AddAt(d.type,e.clientX,e.clientY);
      h171Cleanup();
      e.preventDefault();e.stopPropagation();
    },true);
    document.addEventListener('pointercancel',e=>{if(h171Drag&&e.pointerId===h171Drag.pid)h171Cleanup()},true);
    `;
  if(out.includes(oldClick))out=out.replace(oldClick,dragCode);

  const css=`<style id="h171-inventory-drag-drop-style">
/* Inventory becomes translucent only while an item is being dragged out. */
#h162inventory{transition:background-color .12s ease!important}
#h162inventory .box{transition:opacity .12s ease,background-color .12s ease!important}
#h162inventory.h171-dragging{
  background:rgba(5,4,3,.24)!important;
}
#h162inventory.h171-dragging .box{
  opacity:.38!important;
}
#h162inventory.h171-dragging .h162-inventory-body{
  background:rgba(20,17,15,.28)!important;
}
.h164-inv-mana{touch-action:none!important;-webkit-user-select:none!important;user-select:none!important}
.h171-inventory-ghost{
  position:fixed!important;
  z-index:32000!important;
  left:0;top:0;
  width:32px!important;height:32px!important;
  margin:0!important;
  transform:translate(-50%,-50%) scale(1.08)!important;
  pointer-events:none!important;
  opacity:1!important;
  border-radius:50%!important;
  box-shadow:0 0 0 2px rgba(240,200,75,.92),0 7px 15px #000a!important;
}
body.h171-inventory-dragging{overscroll-behavior:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h170.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
