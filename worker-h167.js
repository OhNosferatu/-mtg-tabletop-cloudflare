import h166 from './worker-h166.js';

const BUILD='H167';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function stamp(source){
  return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
               .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
}

function transformApp(source){
  let out=stamp(source);
  if(out.includes('H167_DELETE_BRIDGE'))return out;
  const marker='function putInZone(id,zone,atTop=false){';
  if(!out.includes(marker))return out;
  const bridge=`/* H167_DELETE_BRIDGE */\nwindow.MTG_H167_boardDelete={\n  removeCard(id){\n    const c=st.cards[id];if(!c)return null;\n    const names=['deck','hand','cmd','side','tokens','graveyard','exile','field','opp'];\n    const snap={kind:'card',id,zone:c.zone,lists:{},oppPublic:{}};\n    for(const name of names){const a=st[name];if(Array.isArray(a)){const i=a.indexOf(id);if(i>=0){snap.lists[name]=i;a.splice(i,1)}}}\n    const p=st.oppPublic||{};\n    for(const name of ['cmd','deck','graveyard','exile','tokens']){const a=p[name];if(Array.isArray(a)){const i=a.indexOf(id);if(i>=0){snap.oppPublic[name]=i;a.splice(i,1)}}}\n    render();return snap;\n  },\n  restoreCard(snap){\n    if(!snap||snap.kind!=='card'||!st.cards[snap.id])return false;\n    const id=snap.id,c=st.cards[id];\n    for(const [name,index] of Object.entries(snap.lists||{})){const a=st[name];if(Array.isArray(a)&&!a.includes(id))a.splice(Math.max(0,Math.min(a.length,index)),0,id)}\n    const p=st.oppPublic||{};\n    for(const [name,index] of Object.entries(snap.oppPublic||{})){const a=p[name];if(Array.isArray(a)&&!a.includes(id))a.splice(Math.max(0,Math.min(a.length,index)),0,id)}\n    c.zone=snap.zone;render();return true;\n  }\n};\n`;
  return out.replace(marker,bridge+marker);
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h167-delete-mode'))return out;

  /* Expose the H164 mana-token array to this focused delete/undo layer without
     changing the established token movement/editor implementation. */
  const manaMarker="grid.addEventListener('click',e=>{const b=e.target.closest('[data-mana]');if(!b)return;addMana(b.dataset.mana)});";
  if(out.includes(manaMarker)){
    const manaBridge=`window.MTG_H167_manaDelete={\n      remove(id){const i=tokens.findIndex(t=>t.id===id);if(i<0)return null;const token={...tokens[i]};tokens.splice(i,1);save();render();return{kind:'mana',token,index:i}},\n      restore(snap){if(!snap||snap.kind!=='mana'||!snap.token||tokens.some(t=>t.id===snap.token.id))return false;tokens.splice(Math.max(0,Math.min(tokens.length,snap.index||0)),0,{...snap.token});save();render();return true}\n    };\n    `;
    out=out.replace(manaMarker,manaBridge+manaMarker);
  }

  const css=`<style id="h167-delete-mode-style">
/* Keep mana values optically and mathematically centered. */
.h164-mana-token{position:absolute!important}
.h164-mana-token .h164-value{
  position:absolute!important;
  left:50%!important;top:50%!important;
  transform:translate(-50%,-50%)!important;
  margin:0!important;
  display:grid!important;place-items:center!important;
  text-align:center!important;
}
/* Token editor closes by tapping outside the symbol/controls; no Close button. */
#h164-editor-close{display:none!important}

/* H167 dropdown tools. Trash icon is CSS-drawn rather than an emoji. */
#h167-trash{position:relative!important;font-size:0!important}
#h167-trash::before{
  content:'';position:absolute;left:50%;top:17px;width:13px;height:15px;
  transform:translateX(-50%);border:2px solid #d3ad70;border-top:0;border-radius:0 0 3px 3px;
}
#h167-trash::after{
  content:'';position:absolute;left:50%;top:12px;width:17px;height:2px;
  transform:translateX(-50%);background:#d3ad70;border-radius:2px;
  box-shadow:0 -3px 0 -1px #d3ad70;
}
#h167-trash.h167-active{border-color:#b95b50!important;background:#442721!important}
#h167-trash.h167-active::before{border-color:#ef887b!important}
#h167-trash.h167-active::after{background:#ef887b!important;box-shadow:0 -3px 0 -1px #ef887b!important}
#h161-menu-toggle.h167-delete-on{border-color:#b95b50!important;box-shadow:inset 0 0 0 1px rgba(185,91,80,.24)!important}
body.h167-delete-mode .card[data-id],body.h167-delete-mode .hcard[data-id],body.h167-delete-mode .h117-full-card[data-id],body.h167-delete-mode .h164-mana-token[data-h164-mana-id]{cursor:crosshair!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h167-delete-mode">window.addEventListener('DOMContentLoaded',()=>{
    const menu=document.getElementById('h161-menu');
    const toggle=document.getElementById('h161-menu-toggle');
    const host=document.getElementById('h161-menu-host');
    if(!menu||!toggle||!host)return;

    const trash=document.createElement('button');trash.id='h167-trash';trash.type='button';trash.setAttribute('role','menuitem');trash.setAttribute('aria-label','Delete mode');trash.title='Delete mode';
    const undo=document.createElement('button');undo.id='h167-undo';undo.type='button';undo.setAttribute('role','menuitem');undo.textContent='Undo';undo.disabled=true;
    menu.appendChild(trash);menu.appendChild(undo);

    let deleteMode=false;const deleted=[];
    const setMode=on=>{deleteMode=!!on;document.body.classList.toggle('h167-delete-mode',deleteMode);trash.classList.toggle('h167-active',deleteMode);toggle.classList.toggle('h167-delete-on',deleteMode);trash.setAttribute('aria-pressed',deleteMode?'true':'false')};
    const refreshUndo=()=>{undo.disabled=deleted.length===0;undo.style.opacity=deleted.length?'1':'.45'};

    trash.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setMode(!deleteMode);host.classList.remove('h161-open');toggle.setAttribute('aria-expanded','false')});
    undo.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const snap=deleted.pop();if(!snap){refreshUndo();return}if(snap.kind==='mana')window.MTG_H167_manaDelete?.restore(snap);else if(snap.kind==='card')window.MTG_H167_boardDelete?.restoreCard(snap);refreshUndo();host.classList.remove('h161-open');toggle.setAttribute('aria-expanded','false')});

    document.addEventListener('pointerdown',e=>{
      if(!deleteMode)return;
      const mana=e.target.closest?.('.h164-mana-token[data-h164-mana-id]');
      const card=e.target.closest?.('[data-id].card,[data-id].hcard,[data-id].h117-full-card');
      let snap=null;
      if(mana)snap=window.MTG_H167_manaDelete?.remove(mana.dataset.h164ManaId)||null;
      else if(card)snap=window.MTG_H167_boardDelete?.removeCard(card.dataset.id)||null;
      if(!snap)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();deleted.push(snap);refreshUndo();
    },true);

    /* No editor Close button: tap anywhere except the mana symbol, +/−/Set,
       or the active native number input to dismiss and return to the board. */
    const editor=document.getElementById('h164-token-editor');
    if(editor){
      editor.addEventListener('pointerdown',e=>{
        if(!editor.classList.contains('on'))return;
        if(e.target.closest('#h164-editor-token,#h164-editor-controls,#h166-native-number'))return;
        const legacyClose=document.getElementById('h164-editor-close');legacyClose?.click();
      });
    }
    refreshUndo();
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h166.fetch(request,env,ctx);
    if(url.pathname.endsWith('.js')){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers(response.headers.get('content-type')||'application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
