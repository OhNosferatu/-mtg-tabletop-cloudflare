(()=>{
  const counters=new Map();
  const bases=new Map();
  let activeId=null;
  let baseHoldTimer=null;
  let baseHeld=false;
  let baseSide='p';
  let renderQueued=false;

  const fmtCounter=n=>n>0?`+${n}/+${n}`:n<0?`${n}/${n}`:'0/0';
  const cardEls=id=>[...document.querySelectorAll('.card[data-id]')].filter(el=>el.dataset.id===id);

  function ensurePreviewReadout(){
    const preview=document.querySelector('.preview');
    if(!preview)return null;
    let el=preview.querySelector('.preview-counter-readout');
    if(!el){
      el=document.createElement('div');
      el.className='preview-counter-readout';
      preview.appendChild(el);
    }
    return el;
  }

  function renderCounterButton(){
    const btn=document.getElementById('one');
    if(!btn)return;
    btn.classList.add('split-stat-button','counter-split-button');
    btn.innerHTML='<span class="split-half counter-plus">+1/+1</span><span class="split-half counter-minus">−1/−1</span>';
  }

  function renderBaseButton(){
    const btn=document.getElementById('manual');
    if(!btn)return;
    btn.classList.add('split-stat-button','base-split-button');
    const base=activeId?bases.get(activeId):null;
    if(!base){
      btn.classList.remove('active-base');
      btn.innerHTML='<span class="base-activate">X/X</span>';
      return;
    }
    btn.classList.add('active-base');
    btn.innerHTML=`<span class="split-half base-power">${base.p}</span><span class="split-half base-toughness">${base.t}</span><span class="base-label">X/X</span>`;
  }

  function renderPreview(){
    const el=ensurePreviewReadout();
    if(!el)return;
    if(!activeId){el.hidden=true;return;}
    const hasCounter=counters.has(activeId);
    const base=bases.get(activeId);
    if(!hasCounter&&!base){el.hidden=true;el.innerHTML='';return;}
    const bits=[];
    if(hasCounter)bits.push(`<span class="counter-line">${fmtCounter(counters.get(activeId)??0)}</span>`);
    if(base)bits.push(`<span class="base-line"><b>${base.p}</b><em>/</em><b>${base.t}</b><small>X/X</small></span>`);
    const html=bits.join('');
    el.hidden=false;
    if(el.innerHTML!==html)el.innerHTML=html;
  }

  function renderBoardCard(id){
    const hasCounter=counters.has(id);
    const base=bases.get(id);
    for(const card of cardEls(id)){
      let badge=card.querySelector('.badge');
      if(!hasCounter&&!base){
        if(badge?.classList.contains('counter-stack'))badge.remove();
        continue;
      }
      if(!badge){
        badge=document.createElement('div');
        badge.className='badge';
        card.appendChild(badge);
      }
      badge.classList.add('counter-stack');
      badge.style.pointerEvents='none';
      badge.setAttribute('aria-hidden','true');
      const bits=[];
      if(hasCounter)bits.push(`<span class="counter-line">${fmtCounter(counters.get(id)??0)}</span>`);
      if(base)bits.push(`<span class="base-line">${base.p}/${base.t}</span>`);
      const html=bits.join('');
      if(badge.innerHTML!==html)badge.innerHTML=html;
    }
  }

  function renderAllNow(){
    renderQueued=false;
    for(const id of new Set([...counters.keys(),...bases.keys()]))renderBoardCard(id);
    if(document.querySelector('#inspect.on'))renderPreview();
    renderCounterButton();
    renderBaseButton();
  }

  function renderAll(){
    if(renderQueued)return;
    renderQueued=true;
    requestAnimationFrame(renderAllNow);
  }

  document.addEventListener('pointerdown',e=>{
    const card=e.target.closest?.('.card[data-id],.hcard[data-id]');
    if(card){activeId=card.dataset.id;renderAll();}
  },true);

  const inspect=document.getElementById('inspect');
  if(inspect)new MutationObserver(()=>{
    if(inspect.classList.contains('on'))renderAll();
  }).observe(inspect,{attributes:true,attributeFilter:['class']});

  const counter=document.getElementById('one');
  if(counter){
    counter.onpointerdown=e=>{
      if(!activeId)return;
      e.preventDefault();
      e.stopPropagation();
      try{counter.setPointerCapture?.(e.pointerId)}catch{}
    };
    counter.onpointerup=e=>{
      if(!activeId)return;
      e.preventDefault();
      e.stopPropagation();
      const r=counter.getBoundingClientRect();
      const delta=e.clientX<r.left+r.width/2?1:-1;
      counters.set(activeId,(counters.get(activeId)??0)+delta);
      try{counter.releasePointerCapture?.(e.pointerId)}catch{}
      renderAll();
    };
    counter.onpointercancel=()=>{};
    counter.onclick=e=>e.preventDefault();
  }

  const manual=document.getElementById('manual');
  if(manual){
    manual.onclick=e=>e.preventDefault();
    manual.onpointerdown=e=>{
      if(!activeId)return;
      e.preventDefault();
      e.stopPropagation();
      const existing=bases.get(activeId);
      const r=manual.getBoundingClientRect();
      baseSide=e.clientX<r.left+r.width/2?'p':'t';
      baseHeld=false;
      clearTimeout(baseHoldTimer);
      try{manual.setPointerCapture?.(e.pointerId)}catch{}
      if(existing){
        baseHoldTimer=setTimeout(()=>{
          const b=bases.get(activeId)||{p:0,t:0};
          b[baseSide]-=1;
          bases.set(activeId,b);
          baseHeld=true;
          renderAll();
        },500);
      }
    };
    manual.onpointerup=e=>{
      if(!activeId)return;
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(baseHoldTimer);
      const existing=bases.get(activeId);
      if(!existing){
        bases.set(activeId,{p:0,t:0});
      }else if(!baseHeld){
        existing[baseSide]+=1;
        bases.set(activeId,existing);
      }
      baseHeld=false;
      try{manual.releasePointerCapture?.(e.pointerId)}catch{}
      renderAll();
    };
    manual.onpointercancel=()=>{
      clearTimeout(baseHoldTimer);
      baseHeld=false;
    };
  }

  const xx=document.getElementById('xx');
  if(xx)xx.style.display='none';

  for(const root of [document.getElementById('field'),document.getElementById('fullcards')]){
    if(root)new MutationObserver(renderAll).observe(root,{childList:true,subtree:true});
  }

  renderCounterButton();
  renderBaseButton();
  renderAll();
})();
