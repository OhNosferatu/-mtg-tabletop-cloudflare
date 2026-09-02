import h93 from './worker-h93.js';

const BUILD='H94';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H94_ZONE_BROWSER'))return source;
  let out=source;

  // Tokens are a normal single-tap pile again. A second tap has no special
  // meaning; the first tap opens the existing stable full-card viewer.
  const oldTokenTap=`      if(from==='tokens'){
        const now=Date.now(),key='tokenpile_'+id,prev=lastTap[key]||0;
        if(now-prev<340){
          clearTimeout(lastTap[key+'_timer']);delete lastTap[key+'_timer'];lastTap[key]=0;
          requestAnimationFrame(()=>openBoardZoom(c));
        }else{
          lastTap[key]=now;
          lastTap[key+'_timer']=setTimeout(()=>{if(lastTap[key]===now){lastTap[key]=0;delete lastTap[key+'_timer']}},340);
        }
        return;
      }`;
  const newTokenTap=`      if(from==='tokens'){
        requestAnimationFrame(()=>openBoardZoom(c));
        return;
      }`;
  out=out.replace(oldTokenTap,newTokenTap);

  const browser=`
/* H94_ZONE_BROWSER */
let h94Zone='deck',h94Query='',h94CardId=null,h94GridObserver=null;
const h94ZoneLabels={deck:'Deck',tokens:'Tokens',discard:'Graveyard',exile:'Exile'};
function h94ZoneIds(zone=h94Zone){const a=st[zone];return Array.isArray(a)?a:[]}

function ensureZoneBrowserH94(){
  let z=$('#h94zonebrowser');
  if(z)return z;
  const style=document.createElement('style');
  style.id='h94zonestyle';
  style.textContent='#h94zonebrowser{display:none;position:fixed;inset:0;z-index:33000;background:rgba(9,8,7,.985);color:#f5ead8;touch-action:manipulation}#h94zonebrowser.on{display:block}#h94zonehead{position:sticky;top:0;z-index:3;padding:max(14px,env(safe-area-inset-top)) 14px 10px;background:rgba(17,14,12,.98);border-bottom:1px solid #5d4b39;box-shadow:0 5px 18px #0008}#h94zonetop{height:42px;display:flex;align-items:center;justify-content:center;position:relative}#h94zonetitle{margin:0;font:900 15px/1 ui-monospace,Menlo,monospace;color:#f0dcb7}#h94zoneclose{position:absolute;right:0;top:0;width:42px;height:42px;border:1px solid #8b7659;border-radius:50%;background:#211b17;color:#fff;font:800 26px/1 system-ui;padding:0;display:grid;place-items:center}#h94zonesearch{display:block;width:100%;height:42px;margin-top:8px;padding:0 13px;border:1px solid #806a50;border-radius:10px;background:#211b17;color:#fff;font:700 13px/1.2 system-ui;outline:none}#h94zonesearch::placeholder{color:#b7aa98}#h94zonebody{height:calc(100dvh - max(14px,env(safe-area-inset-top)) - 102px);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:12px 10px max(20px,env(safe-area-inset-bottom))}#h94zonegrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px 7px;align-items:start}.h94gridcard{position:relative;width:100%;aspect-ratio:.716;border:0;border-radius:7px;padding:0;overflow:hidden;background:#17130f;box-shadow:0 4px 11px #0009;touch-action:manipulation}.h94gridcard img{display:block;width:100%;height:100%;object-fit:cover;pointer-events:none}.h94gridname{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:5px;background:#211b17;color:#f0dcb7;font:800 7px/1.2 ui-monospace,Menlo,monospace;text-align:center;overflow:hidden}.h94gridindex{position:absolute;left:3px;top:3px;z-index:2;min-width:17px;height:17px;padding:0 3px;border-radius:9px;background:#15110ddd;border:1px solid #806a50;color:#f5ead8;font:800 7px/17px ui-monospace,Menlo,monospace;text-align:center;pointer-events:none}#h94zoneempty{display:none;padding:48px 12px;text-align:center;color:#b7aa98;font:800 12px/1.4 ui-monospace,Menlo,monospace}#h94zoneempty.on{display:block}.h94-zone-search{position:absolute!important;right:5px!important;bottom:5px!important;z-index:20!important;width:27px!important;height:27px!important;min-height:0!important;padding:0!important;border:1px solid #8b7659!important;border-radius:50%!important;background:#211b17ee!important;color:#f5ead8!important;font:800 14px/1 system-ui!important;display:grid!important;place-items:center!important;touch-action:manipulation!important}.h94-searchable-pile{position:relative!important}#h94decksearch{position:absolute;right:5px;top:4px;z-index:2;width:30px;height:30px;min-height:0;padding:0;border:1px solid #8b7659;border-radius:50%;background:#211b17;color:#f5ead8;font:800 14px/1 system-ui;display:grid;place-items:center;touch-action:manipulation}#deckoverlaystatus{position:relative;padding-right:40px!important}#h94zonecard{display:none;position:fixed;inset:0;z-index:34000;background:rgba(5,5,5,.93);align-items:center;justify-content:center;padding:max(62px,env(safe-area-inset-top)) 12px max(100px,env(safe-area-inset-bottom));touch-action:manipulation}#h94zonecard.on{display:flex}#h94zonecardclose{position:fixed;right:14px;top:max(14px,env(safe-area-inset-top));z-index:34004;width:46px;height:46px;border:1px solid #8b7659;border-radius:50%;background:#211b17;color:#fff;font:800 30px/1 system-ui;display:grid;place-items:center;padding:0}#h94zonecardwrap{display:flex;align-items:center;justify-content:center;max-width:min(78vw,370px);max-height:calc(100dvh - 190px)}#h94zonecardimg{display:block;max-width:100%;max-height:calc(100dvh - 190px);width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 12px 36px #000}#h94zonecardname{display:none;align-items:center;justify-content:center;width:min(78vw,370px);aspect-ratio:.716;padding:18px;border:1px solid #806a50;border-radius:12px;background:#211b17;color:#f0dcb7;font:900 15px/1.3 ui-monospace,Menlo,monospace;text-align:center}#h94zonecardcontrols{position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:34003;width:min(94vw,620px);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;padding:8px;border:1px solid #5d4b39;border-radius:12px;background:#18130ff2;box-shadow:0 -8px 24px #0008}#h94zonecardcontrols button{min-height:48px;border:1px solid #806a50;border-radius:8px;background:#2b231c;color:#f5ead8;font:800 10px/1.1 ui-monospace,Menlo,monospace;padding:6px 4px;touch-action:manipulation}#h94zonecardcontrols button[data-h94move="discard"],#h94zonecardcontrols button[data-h94move="exile"]{border-color:#7f4c45}@media(max-width:390px){#h94zonegrid{gap:8px 6px}#h94zonebody{padding-left:8px;padding-right:8px}.h94gridindex{height:16px;min-width:16px;font-size:6px;line-height:16px}#h94zonecardwrap,#h94zonecardname{max-width:min(80vw,350px)}#h94zonecardcontrols button{min-height:46px;font-size:9px}}';
  document.head.appendChild(style);

  z=document.createElement('section');
  z.id='h94zonebrowser';
  z.innerHTML='<div id="h94zonehead"><div id="h94zonetop"><h2 id="h94zonetitle">Deck</h2><button id="h94zoneclose" aria-label="Close search">×</button></div><input id="h94zonesearch" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search by card name"></div><div id="h94zonebody"><div id="h94zonegrid"></div><div id="h94zoneempty">No cards found</div></div>';
  document.body.appendChild(z);

  const card=document.createElement('section');
  card.id='h94zonecard';
  card.innerHTML='<button id="h94zonecardclose" aria-label="Back to search">×</button><div id="h94zonecardwrap"><img id="h94zonecardimg" alt="Card preview" decoding="async"><div id="h94zonecardname"></div></div><div id="h94zonecardcontrols"><button data-h94move="hand">To Hand</button><button data-h94move="discard">Discard</button><button data-h94move="exile">Exile</button></div>';
  document.body.appendChild(card);

  $('#h94zoneclose').addEventListener('click',e=>{e.preventDefault();closeZoneBrowserH94()});
  $('#h94zonesearch').addEventListener('input',e=>{h94Query=e.target.value||'';const body=$('#h94zonebody');if(body)body.scrollTop=0;renderZoneBrowserH94()});
  $('#h94zonecardclose').addEventListener('click',e=>{e.preventDefault();closeZoneCardH94()});
  card.addEventListener('click',e=>{if(e.target===card)closeZoneCardH94()});
  $('#h94zonecardcontrols').addEventListener('click',e=>{const b=e.target.closest('button[data-h94move]');if(b)moveZoneSearchCardH94(b.dataset.h94move)});
  return z;
}

function h94SetGridCardArt(el,c){
  if(!el||!c)return;
  const src=frontImage(c)||'';
  if(!src)return;
  let img=el.querySelector('img');
  if(!img){img=document.createElement('img');img.draggable=false;el.insertBefore(img,el.querySelector('.h94gridname')||el.firstChild)}
  if(img.getAttribute('src')!==src)img.setAttribute('src',src);
  el.querySelector('.h94gridname')?.remove();
}

function h94ObserveGridCards(){
  h94GridObserver?.disconnect();
  const root=$('#h94zonebody');
  if(!root)return;
  h94GridObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      const el=entry.target,id=el.dataset.id,c=st.cards[id];
      h94GridObserver?.unobserve(el);
      if(!c)continue;
      if(frontImage(c)){h94SetGridCardArt(el,c);continue}
      load(c).then(()=>{if(el.isConnected&&el.dataset.id===id)h94SetGridCardArt(el,c)}).catch(()=>{});
    }
  },{root,rootMargin:'260px 0px'});
  document.querySelectorAll('#h94zonegrid .h94gridcard').forEach(el=>h94GridObserver.observe(el));
}

function renderZoneBrowserH94(){
  const z=ensureZoneBrowserH94();if(!z.classList.contains('on'))return;
  const ids=h94ZoneIds(),q=h94Query.trim().toLowerCase();
  const filtered=ids.filter(id=>{const c=st.cards[id];return c&&(!q||String(c.name||'').toLowerCase().includes(q))});
  const title=$('#h94zonetitle');if(title)title.textContent=(h94ZoneLabels[h94Zone]||h94Zone)+' · '+filtered.length+(filtered.length!==ids.length?'/'+ids.length:'');
  const grid=$('#h94zonegrid'),empty=$('#h94zoneempty');if(!grid)return;
  h94GridObserver?.disconnect();grid.innerHTML='';
  filtered.forEach(id=>{
    const c=st.cards[id];if(!c)return;
    const b=document.createElement('button');b.type='button';b.className='h94gridcard';b.dataset.id=id;
    const originalIndex=ids.indexOf(id)+1;
    b.innerHTML='<span class="h94gridname"></span><span class="h94gridindex">'+originalIndex+'</span>';
    b.querySelector('.h94gridname').textContent=c.name||'Card';
    if(frontImage(c))h94SetGridCardArt(b,c);
    b.addEventListener('click',e=>{e.preventDefault();openZoneCardH94(id)});
    grid.appendChild(b);
  });
  if(empty)empty.classList.toggle('on',filtered.length===0);
  requestAnimationFrame(h94ObserveGridCards);
}

function openZoneBrowserH94(zone){
  if(!['deck','tokens','discard','exile'].includes(zone))return;
  ensureZoneBrowserH94();h94Zone=zone;h94Query='';h94CardId=null;
  const input=$('#h94zonesearch');if(input)input.value='';
  if(zone==='deck')closeDeckOverlay();
  const bz=$('#boardzoom');if(bz)bz.classList.remove('on');
  const z=$('#h94zonebrowser');z?.classList.add('on');
  const body=$('#h94zonebody');if(body)body.scrollTop=0;
  renderZoneBrowserH94();
}

function closeZoneBrowserH94(){
  h94GridObserver?.disconnect();h94CardId=null;h94Query='';
  $('#h94zonecard')?.classList.remove('on');
  $('#h94zonebrowser')?.classList.remove('on');
  $('#h94zonecardimg')?.removeAttribute('src');
}

function openZoneCardH94(id){
  ensureZoneBrowserH94();const c=st.cards[id];if(!c)return;h94CardId=id;
  const panel=$('#h94zonecard'),img=$('#h94zonecardimg'),name=$('#h94zonecardname');if(!panel||!img||!name)return;
  img.removeAttribute('src');name.textContent=c.name||'Card';name.style.display='flex';img.style.display='none';panel.classList.add('on');
  const show=()=>{if(h94CardId!==id||!panel.classList.contains('on'))return;const src=frontImage(c)||'';if(src){img.src=src;img.style.display='block';name.style.display='none'}};
  if(frontImage(c))show();else load(c).then(show).catch(()=>{});
}

function closeZoneCardH94(){
  h94CardId=null;const panel=$('#h94zonecard');panel?.classList.remove('on');$('#h94zonecardimg')?.removeAttribute('src');
}

function moveZoneSearchCardH94(zone){
  const id=h94CardId,c=id?st.cards[id]:null;if(!c||!['hand','discard','exile'].includes(zone))return;
  putInZone(id,zone);c.faceDown=false;c.tap=false;
  closeZoneCardH94();render();renderZoneBrowserH94();
}

function installPileSearchButtonH94(el,zone){
  if(!el||el.querySelector('.h94-zone-search'))return;
  el.classList.add('h94-searchable-pile');
  const b=document.createElement('button');b.type='button';b.className='h94-zone-search';b.textContent='⌕';b.setAttribute('aria-label','Search '+(h94ZoneLabels[zone]||zone));
  b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation()});
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openZoneBrowserH94(zone)});
  el.appendChild(b);
}

function installDeckSearchButtonH94(){
  const bottom=$('#deckoverlaybottom');if(!bottom)return false;
  if(bottom.querySelector('#h94decksearch'))return true;
  const b=document.createElement('button');b.type='button';b.id='h94decksearch';b.textContent='⌕';b.setAttribute('aria-label','Search Deck');
  b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation()});
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openZoneBrowserH94('deck')});
  bottom.appendChild(b);return true;
}

function installZoneSearchEntryPointsH94(){
  for(const [sel,zone] of [['#tokens','tokens'],['#discard','discard'],['#exile','exile']])installPileSearchButtonH94($(sel),zone);
  installDeckSearchButtonH94();
}

ensureZoneBrowserH94();
installZoneSearchEntryPointsH94();
for(const [sel,zone] of [['#tokens','tokens'],['#discard','discard'],['#exile','exile']]){
  const el=$(sel);if(!el)continue;
  new MutationObserver(()=>installPileSearchButtonH94(el,zone)).observe(el,{childList:true});
}
if(!installDeckSearchButtonH94()){
  const deckObserver=new MutationObserver(()=>{if(installDeckSearchButtonH94())deckObserver.disconnect()});
  deckObserver.observe(document.body,{childList:true,subtree:true});
}
`;

  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+browser+out.slice(end);
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h93.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H93','H94').replaceAll('h93-','h94-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
