(()=>{
  const api=window.__MTG;
  if(!api)return;

  let selectedId=null;
  let imageObserver=null;

  function installStyles(){
    if(document.getElementById('deck-search-style'))return;
    const s=document.createElement('style');
    s.id='deck-search-style';
    s.textContent=`
#searchdeck{grid-column:1/-1!important;min-height:40px!important;background:#382f24!important;border-color:#b99a69!important}
#inspect.deck-search-open #deckctrl{visibility:hidden!important}
#decksearch{display:none;position:absolute;inset:max(58px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom));z-index:20080;background:#171310f8;border:1px solid #745f49;border-radius:14px;padding:9px;min-height:0;flex-direction:column;gap:8px;color:#f4eadb;touch-action:auto!important;-webkit-user-select:none!important;user-select:none!important}
#decksearch.on{display:flex!important}
#decksearch *{box-sizing:border-box}
.ds-head{display:flex;align-items:center;gap:8px;min-height:38px}
.ds-head b{font-size:13px;flex:1}.ds-count{font-size:8px;opacity:.72}.ds-close{width:38px;height:38px;border:1px solid #806b52;border-radius:9px;background:#2b241e;color:#fff;font-size:22px;font-weight:900}
#dsquery{width:100%;min-height:42px;border:1px solid #66513e;border-radius:9px;background:#100e0c;color:#fff;padding:9px 11px;font:600 16px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;-webkit-user-select:text!important;user-select:text!important;touch-action:manipulation!important}
#dsgrid{flex:1;min-height:0;overflow-y:auto!important;overflow-x:hidden!important;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-content:start;gap:6px;padding:2px 1px 8px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y!important}
.ds-card{position:relative;min-width:0;border:1px solid #554535;border-radius:7px;background:#211b17;color:#f4eadb;padding:3px;text-align:left;overflow:hidden;touch-action:manipulation!important}
.ds-card.selected{border:2px solid #f0c84d!important;box-shadow:0 0 0 2px #f0c84d44}
.ds-art{width:100%;aspect-ratio:.716;border-radius:5px;background:#0e0c0b;display:grid;place-items:center;overflow:hidden;color:#8f8172;font-size:6px}
.ds-art img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.ds-name{display:block;height:25px;padding:3px 2px 0;font-size:6.5px;line-height:1.15;overflow:hidden}
.ds-pos{position:absolute;left:5px;top:5px;z-index:2;min-width:19px;height:19px;padding:0 4px;border-radius:10px;display:grid;place-items:center;background:#17120ee8;border:1px solid #d3ad70;color:#fff;font-size:6px;font-weight:900}
.ds-selected{min-height:18px;font-size:8px;color:#d7c8b4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px}
.ds-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
.ds-actions button{min-width:0;min-height:40px;border:1px solid #7c674f;border-radius:8px;background:#2c251f;color:#fff;font:800 7.5px/1.15 ui-monospace,SFMono-Regular,Menlo,monospace;padding:5px 3px;touch-action:manipulation!important}
.ds-actions button:disabled{opacity:.35}
#dszoom{display:none;position:absolute;inset:0;z-index:20100;background:#080706f7;border-radius:14px;align-items:center;justify-content:center;padding:48px 16px 16px;touch-action:none!important}
#dszoom.on{display:flex}
#dszoom img{max-width:min(80%,330px);max-height:88%;object-fit:contain;border-radius:12px}
.ds-zoom-close{position:absolute;right:10px;top:10px;width:40px;height:40px;border:1px solid #806b52;border-radius:50%;background:#211b17;color:#fff;font-size:24px;font-weight:900}
@media(max-width:390px){#decksearch{inset:max(54px,env(safe-area-inset-top)) 7px max(7px,env(safe-area-inset-bottom));padding:7px;gap:6px}#dsgrid{gap:5px}.ds-name{font-size:6px}.ds-actions{gap:4px}.ds-actions button{min-height:38px;font-size:7px}}
`;
    document.head.appendChild(s);
  }

  function installUI(){
    installStyles();
    const inspect=document.getElementById('inspect');
    if(!inspect)return null;

    let panel=document.getElementById('decksearch');
    if(!panel){
      panel=document.createElement('div');
      panel.id='decksearch';
      panel.innerHTML=`
        <div class="ds-head"><b>Search Deck</b><span id="dscount" class="ds-count"></span><button id="dsclose" class="ds-close" type="button" aria-label="Close deck search">×</button></div>
        <input id="dsquery" type="search" placeholder="Search card names…" autocomplete="off" autocorrect="off" spellcheck="false">
        <div id="dsgrid"></div>
        <div id="dsselected" class="ds-selected">Tap a card to select it.</div>
        <div class="ds-actions">
          <button type="button" data-dsa="view" disabled>View</button>
          <button type="button" data-dsa="hand" disabled>To Hand</button>
          <button type="button" data-dsa="field" disabled>Battlefield</button>
          <button type="button" data-dsa="top" disabled>Move to Top</button>
          <button type="button" data-dsa="bottom" disabled>Move to Bottom</button>
        </div>
        <div id="dszoom"><button type="button" class="ds-zoom-close" aria-label="Close card view">×</button><img id="dszoomimg" alt="Selected card"></div>`;
      inspect.appendChild(panel);
      panel.querySelector('#dsclose').addEventListener('click',closeSearch);
      panel.querySelector('#dsquery').addEventListener('input',renderSearch);
      panel.querySelector('.ds-actions').addEventListener('click',e=>{
        const b=e.target.closest('button[data-dsa]');
        if(b&&!b.disabled)runAction(b.dataset.dsa);
      });
      panel.querySelector('#dszoom').addEventListener('click',e=>{
        if(e.target.id==='dszoom'||e.target.closest('.ds-zoom-close'))panel.querySelector('#dszoom').classList.remove('on');
      });
      panel.querySelector('#dsgrid').addEventListener('click',e=>{
        const card=e.target.closest('.ds-card[data-id]');
        if(!card)return;
        selectedId=card.dataset.id;
        syncSelection();
      });
    }
    return panel;
  }

  function installSearchButton(){
    const deckctrl=document.getElementById('deckctrl');
    if(!deckctrl)return false;
    if(document.getElementById('searchdeck'))return true;
    const b=document.createElement('button');
    b.id='searchdeck';
    b.type='button';
    b.textContent='Search Deck';
    const status=deckctrl.querySelector('.deckstatus');
    status?.insertAdjacentElement('afterend',b);
    b.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      openSearch();
    });
    return true;
  }

  function syncSelection(){
    const panel=document.getElementById('decksearch');
    if(!panel)return;
    panel.querySelectorAll('.ds-card').forEach(el=>el.classList.toggle('selected',el.dataset.id===selectedId));
    const c=selectedId?api.st.cards[selectedId]:null;
    const stillInDeck=!!c&&api.st.deck.includes(selectedId);
    if(!stillInDeck)selectedId=null;
    const selected=selectedId?api.st.cards[selectedId]:null;
    panel.querySelector('#dsselected').textContent=selected?selected.name:'Tap a card to select it.';
    panel.querySelectorAll('[data-dsa]').forEach(b=>b.disabled=!selected);
  }

  function cardFront(c){
    return api.frontImage(c)||'';
  }

  function observeArt(){
    imageObserver?.disconnect();
    const grid=document.getElementById('dsgrid');
    if(!grid)return;
    if(!('IntersectionObserver' in window)){
      [...grid.querySelectorAll('.ds-card')].slice(0,24).forEach(loadArt);
      return;
    }
    imageObserver=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(entry.isIntersecting){
          imageObserver.unobserve(entry.target);
          loadArt(entry.target);
        }
      }
    },{root:grid,rootMargin:'180px 0px'});
    grid.querySelectorAll('.ds-card').forEach(el=>imageObserver.observe(el));
  }

  async function loadArt(el){
    const id=el.dataset.id,c=api.st.cards[id];
    if(!c)return;
    await api.load(c);
    if(!el.isConnected)return;
    const art=el.querySelector('.ds-art'),src=cardFront(c);
    if(art&&src)art.innerHTML=`<img src="${src}" alt="">`;
  }

  function renderSearch(){
    const panel=installUI();
    if(!panel)return;
    const grid=panel.querySelector('#dsgrid');
    const q=(panel.querySelector('#dsquery').value||'').trim().toLowerCase();
    const rows=[];
    api.st.deck.forEach((id,index)=>{
      const c=api.st.cards[id];
      if(!c)return;
      if(q&&!c.name.toLowerCase().includes(q))return;
      rows.push({id,index,c});
    });
    grid.innerHTML='';
    for(const row of rows){
      const b=document.createElement('button');
      b.type='button';
      b.className='ds-card'+(row.id===selectedId?' selected':'');
      b.dataset.id=row.id;
      const src=cardFront(row.c);
      b.innerHTML=`<span class="ds-pos">${row.index+1}</span><span class="ds-art">${src?`<img src="${src}" alt="">`:'Loading…'}</span><span class="ds-name"></span>`;
      b.querySelector('.ds-name').textContent=row.c.name;
      grid.appendChild(b);
    }
    panel.querySelector('#dscount').textContent=q?`${rows.length} of ${api.st.deck.length}`:`${api.st.deck.length} cards`;
    syncSelection();
    observeArt();
  }

  function openSearch(){
    const panel=installUI();
    if(!panel||!api.st.deck.length)return;
    selectedId=null;
    panel.querySelector('#dsquery').value='';
    panel.classList.add('on');
    document.getElementById('inspect')?.classList.add('deck-search-open');
    renderSearch();
    setTimeout(()=>panel.querySelector('#dsquery')?.focus(),50);
  }

  function closeSearch(){
    const panel=document.getElementById('decksearch');
    panel?.classList.remove('on');
    panel?.querySelector('#dszoom')?.classList.remove('on');
    document.getElementById('inspect')?.classList.remove('deck-search-open');
    imageObserver?.disconnect();
    selectedId=null;
  }

  async function refreshDeckAfterChange(){
    api.syncDeckFaces();
    api.render();
    if(api.st.deck.length)await api.showDeckTop(api.st.deckFlipped);
    renderSearch();
  }

  async function runAction(action){
    const id=selectedId,c=id?api.st.cards[id]:null;
    if(!c||!api.st.deck.includes(id))return;

    if(action==='view'){
      await api.load(c);
      const src=cardFront(c);
      if(src){
        document.getElementById('dszoomimg').src=src;
        document.getElementById('dszoom').classList.add('on');
      }
      return;
    }

    if(action==='hand'){
      api.removeFromAll(id);
      c.zone='hand';c.tap=false;c.faceDown=false;
      api.st.hand.push(id);
      await api.load(c);
      selectedId=null;
      await refreshDeckAfterChange();
      return;
    }

    if(action==='field'){
      const field=document.getElementById('field'),r=field.getBoundingClientRect();
      api.placeOnField(id,r.left+r.width*.55,r.top+r.height*.45,false);
      await api.load(c);
      selectedId=null;
      await refreshDeckAfterChange();
      return;
    }

    const deck=api.st.deck;
    const index=deck.indexOf(id);
    if(index<0)return;
    deck.splice(index,1);
    if(action==='top')deck.unshift(id);
    if(action==='bottom')deck.push(id);
    await refreshDeckAfterChange();
  }

  const tryInstall=()=>{
    installUI();
    if(!installSearchButton())setTimeout(tryInstall,100);
  };
  tryInstall();

  const inspect=document.getElementById('inspect');
  if(inspect)new MutationObserver(()=>{
    if(!inspect.classList.contains('on'))closeSearch();
  }).observe(inspect,{attributes:true,attributeFilter:['class']});
})();