import h168 from './worker-h168.js';

const BUILD='H169';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=stamp(source);
  if(out.includes('H169_DELETE_ALL_MOVABLE'))return out;
  const marker='function putInZone(id,zone,atTop=false){';
  if(!out.includes(marker))return out;
  const bridge=`/* H169_DELETE_ALL_MOVABLE */\nwindow.MTG_H169_deleteBridge={\n  removeCard(id){\n    id=String(id||'');const c=st.cards[id];if(!c)return null;\n    const snap={kind:'card',id,zone:c.zone,lists:{},oppPublic:{}};\n    for(const name of ['deck','hand','cmd','side','tokens','graveyard','exile','field','opp']){const a=st[name];if(Array.isArray(a)){const i=a.indexOf(id);if(i>=0){snap.lists[name]=i;a.splice(i,1)}}}\n    const p=st.oppPublic||{};\n    for(const name of ['cmd','deck','graveyard','exile','tokens']){const a=p[name];if(Array.isArray(a)){const i=a.indexOf(id);if(i>=0){snap.oppPublic[name]=i;a.splice(i,1)}}}\n    render();requestAnimationFrame(()=>window.MTG_H169_deleteBridge.tag());return snap;\n  },\n  restoreCard(snap){\n    if(!snap||snap.kind!=='card'||!st.cards[snap.id])return false;const id=snap.id,c=st.cards[id];\n    for(const [name,index] of Object.entries(snap.lists||{})){const a=st[name];if(Array.isArray(a)&&!a.includes(id))a.splice(Math.max(0,Math.min(a.length,index)),0,id)}\n    const p=st.oppPublic||{};for(const [name,index] of Object.entries(snap.oppPublic||{})){const a=p[name];if(Array.isArray(a)&&!a.includes(id))a.splice(Math.max(0,Math.min(a.length,index)),0,id)}\n    c.zone=snap.zone;render();requestAnimationFrame(()=>window.MTG_H169_deleteBridge.tag());return true;\n  },\n  tag(){\n    const mark=(el,id)=>{if(!el)return;el.removeAttribute('data-h169-delete-card');if(id&&st.cards[id]){el.dataset.id=id;el.dataset.h169DeleteCard='1'}};\n    mark(document.getElementById('deck'),st.deck?.[0]);mark(document.getElementById('graveyard'),st.graveyard?.[0]);mark(document.getElementById('exile'),st.exile?.[0]);mark(document.getElementById('tokens'),st.tokens?.[0]);\n    document.querySelectorAll('#cmds .cmd').forEach((el,i)=>mark(el,st.cmd?.[i]));\n    for(const owner of ['you','opp']){const root=document.getElementById('h116-piles-'+owner);if(!root)continue;const p=owner==='you'?st:(st.oppPublic||{});for(const zone of ['deck','graveyard','exile','tokens'])mark(root.querySelector('[data-h117-zone="'+zone+'"]'),p?.[zone]?.[0]);const cmd=root.querySelector('[data-h117-zone="cmd"]');if(cmd)cmd.querySelectorAll('.cmd').forEach((el,i)=>mark(el,p?.cmd?.[i]));}\n    const overlay=document.getElementById('h157-opp-piles'),p=st.oppPublic||{};if(overlay){for(const [zone,cls] of [['deck','h157-deck'],['graveyard','h157-graveyard'],['exile','h157-exile'],['tokens','h157-tokens']])mark(overlay.querySelector('.'+cls),p?.[zone]?.[0]);overlay.querySelectorAll('.h157-cmd .cmd').forEach((el,i)=>mark(el,p?.cmd?.[i]))}\n  }\n};\nwindow.MTG_H167_boardDelete=window.MTG_H169_deleteBridge;\n`;
  return out.replace(marker,bridge+marker);
}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h169-generic-counter-delete'))return out;

  // Add a permanent generic Counter item to the Inventory token catalog.
  out=out.replace(
    "R:{name:'Red',cls:'h164-mana-r',symbol:'R'},G:{name:'Green',cls:'h164-mana-g',symbol:'G'},C:{name:'Colorless',cls:'h164-mana-c',symbol:'C'}",
    "R:{name:'Red',cls:'h164-mana-r',symbol:'R'},G:{name:'Green',cls:'h164-mana-g',symbol:'G'},C:{name:'Colorless',cls:'h164-mana-c',symbol:'C'},N:{name:'Counter',cls:'h169-counter',symbol:''}"
  );
  out=out.replace(
    "const tokenHtml=t=>{const n=Number(t.value)||0,ty=typeOf(t);return n>0?'<span class=\"h164-value\">'+n+'</span>':'<span class=\"h164-symbol\">'+ty.symbol+'</span>'};",
    "const tokenHtml=t=>{const n=Number(t.value)||0,ty=typeOf(t);if(t?.type==='N')return '<span class=\"h164-value\">'+n+'</span>';return n>0?'<span class=\"h164-value\">'+n+'</span>':'<span class=\"h164-symbol\">'+ty.symbol+'</span>'};"
  );

  // Let H167's existing delete/undo stack also recognize pile-top cards that H169 tags.
  out=out.replace(
    "[data-id].card,[data-id].hcard,[data-id].h117-full-card');",
    "[data-id].card,[data-id].hcard,[data-id].h117-full-card,[data-h169-delete-card=\"1\"]');"
  );

  const css=`<style id="h169-generic-counter-delete-style">
/* Generic inventory Counter: simple white token, black centered value, negatives allowed. */
.h169-counter{background:#fff!important;background-image:none!important;border-color:#d8d8d8!important;color:#000!important}
.h169-counter .h164-value{color:#000!important;background:transparent!important;text-shadow:none!important;font-weight:1000!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;text-align:center!important;place-items:center!important}
.h164-mana-preview.h169-counter{color:#000!important;position:relative!important}
.h164-mana-preview.h169-counter::after{content:'0';position:absolute;inset:0;display:grid;place-items:center;font:1000 13px/1 ui-monospace,Menlo,monospace;color:#000}
#h164-editor-token.h169-counter{background:#fff!important;background-image:none!important}
#h164-editor-token.h169-counter .h164-value{color:#000!important;background:transparent!important;text-shadow:none!important}
/* Pile tops tagged by the app bridge are delete targets too. */
body.h167-delete-mode [data-h169-delete-card="1"]{cursor:crosshair!important;outline:2px solid rgba(239,136,123,.28);outline-offset:2px}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h169-generic-counter-delete">window.addEventListener('DOMContentLoaded',()=>{
    const tag=()=>window.MTG_H169_deleteBridge?.tag?.();
    tag();setInterval(tag,300);
    document.querySelectorAll('[data-v]').forEach(b=>b.addEventListener('click',()=>requestAnimationFrame(tag)));
    document.getElementById('mulligan')?.addEventListener('click',()=>requestAnimationFrame(tag));
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h168.fetch(request,env,ctx);
    if(url.pathname.endsWith('.js')){const text=await response.text();return new Response(transformApp(text),{status:response.status,headers:headers(response.headers.get('content-type')||'application/javascript; charset=utf-8')})}
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){const text=await response.text();return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')})}
    return response;
  }
};
