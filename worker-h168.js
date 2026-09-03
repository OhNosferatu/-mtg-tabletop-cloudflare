import h167 from './worker-h167.js';

const BUILD='H168';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function stamp(source){
  return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
               .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h168-card-coordinate-mana'))return out;

  /* Mana tokens use the same battlefield coordinate space as normal cards.
     Your Side is based on #field; Full Board is the exact player half. */
  out=out.replace(
    "if(mode==='you'){d.style.left='calc('+t.x*100+'% - '+(D*t.x)+'px)';d.style.top='calc('+t.y*100+'% - '+(D*t.y)+'px)';return}",
    "if(mode==='you'){const host=document.getElementById('you'),field=document.getElementById('field');if(!host||!field)return;const hr=host.getBoundingClientRect(),fr=field.getBoundingClientRect();d.style.left=(fr.left-hr.left+t.x*Math.max(0,fr.width-D))+'px';d.style.top=(fr.top-hr.top+t.y*Math.max(0,fr.height-D))+'px';return}"
  );

  out=out.replace(
    "const board=document.getElementById('board'),field=document.getElementById('field');const br=board?.getBoundingClientRect();if(!br||!br.width)return{x:.18,y:.03};",
    "const field=document.getElementById('field');const br=field?.getBoundingClientRect();if(!br||!br.width)return{x:.03,y:.03};"
  );
  out=out.replace("const startX=.18,startY=.03,maxX=.96-sw,maxY=.92-sh","const startX=.03,startY=.03,maxX=.97-sw,maxY=.97-sh");

  out=out.replace(
    "if(mode==='you'){const r=document.getElementById('you')?.getBoundingClientRect();if(!r||!r.width)return;t.x=Math.max(0,Math.min(1,(e.clientX-r.left-D/2)/Math.max(1,r.width-D)));t.y=Math.max(0,Math.min(1,(e.clientY-r.top-D/2)/Math.max(1,r.height-D)));placeEl(el,t,'you')}",
    "if(mode==='you'){const r=document.getElementById('field')?.getBoundingClientRect();if(!r||!r.width)return;t.x=Math.max(0,Math.min(1,(e.clientX-r.left-D/2)/Math.max(1,r.width-D)));t.y=Math.max(0,Math.min(1,(e.clientY-r.top-D/2)/Math.max(1,r.height-D)));placeEl(el,t,'you')}"
  );

  /* Expose a narrow lifecycle bridge so game-reset actions can treat inventory
     objects like temporary battlefield cards. */
  const bridgeMarker="grid.addEventListener('click',e=>{const b=e.target.closest('[data-mana]');if(!b)return;addMana(b.dataset.mana)});";
  if(out.includes(bridgeMarker)&&!out.includes('MTG_H168_manaLifecycle')){
    out=out.replace(bridgeMarker,
      "window.MTG_H168_manaLifecycle={clear(){tokens.length=0;save();render()},render};"+bridgeMarker
    );
  }

  const css=`<style id="h168-card-coordinate-mana-style">
/* Delete mode is an intentionally persistent tool state. Keep its tray visible. */
body.h167-delete-mode #h161-menu-host{z-index:1200!important}
body.h167-delete-mode #h161-menu{display:flex!important}
body.h167-delete-mode #h161-menu-toggle::before{transform:translate(-50%,-20%) rotate(225deg)!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h168-card-coordinate-mana">window.addEventListener('DOMContentLoaded',()=>{
    const host=document.getElementById('h161-menu-host');
    const toggle=document.getElementById('h161-menu-toggle');
    const trash=document.getElementById('h167-trash');
    const undo=document.getElementById('h167-undo');
    const mulligan=document.getElementById('mulligan');

    /* Mulligan is a reset of temporary battlefield inventory objects. */
    mulligan?.addEventListener('click',()=>{window.MTG_H168_manaLifecycle?.clear()},true);

    /* H167 intentionally closes the menu after Trash/Undo. Restore the tray
       immediately while delete mode remains active, and keep Undo in place. */
    const reopen=()=>{
      if(!document.body.classList.contains('h167-delete-mode'))return;
      host?.classList.add('h161-open');toggle?.setAttribute('aria-expanded','true');
    };
    trash?.addEventListener('click',()=>requestAnimationFrame(reopen));
    undo?.addEventListener('click',()=>requestAnimationFrame(reopen));

    /* H161 normally closes its dropdown when the board is pressed. During
       delete mode the tool tray stays down while objects are deleted. */
    document.addEventListener('pointerdown',()=>{if(document.body.classList.contains('h167-delete-mode'))requestAnimationFrame(reopen)},true);

    /* Existing saved tokens from pre-H168 used the screen coordinate space.
       New movement/placement is now card-relative. Re-render once after load. */
    requestAnimationFrame(()=>window.MTG_H168_manaLifecycle?.render?.());
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h167.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
