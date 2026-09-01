(()=>{
  const counters=new Map();
  const bases=new Map();
  let activeId=null;
  let holdTimer=null;
  let held=false;
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

  function renderPreview(){
    const el=ensurePreviewReadout();
    if(!el)return;
    if(!activeId){el.hidden=true;return;}
    const n=counters.get(activeId)??0;
    const base=bases.get(activeId);
    const html=`<span class="counter-line">${fmtCounter(n)}</span>${base?`<small class="base-line">${base.p}/${base.t}</small>`:''}`;
    el.hidden=false;
    if(el.innerHTML!==html)el.innerHTML=html;
  }

  function renderBoardCard(id){
    const hasCounter=counters.has(id);
    const base=bases.get(id);
    if(!hasCounter&&!base)return;
    const n=counters.get(id)??0;
    const html=`<span class="counter-line">${fmtCounter(n)}</span>${base?`<span class="base-line">${base.p}/${base.t}</span>`:''}`;
    for(const card of cardEls(id)){
      let badge=card.querySelector('.badge');
      if(!badge){
        badge=document.createElement('div');
        badge.className='badge';
        card.appendChild(badge);
      }
      badge.classList.add('counter-stack');
      badge.style.pointerEvents='none';
      badge.setAttribute('aria-hidden','true');
      if(badge.innerHTML!==html)badge.innerHTML=html;
    }
  }

  function renderAllNow(){
    renderQueued=false;
    for(const id of new Set([...counters.keys(),...bases.keys()]))renderBoardCard(id);
    if(document.querySelector('#inspect.on'))renderPreview();
  }

  function renderAll(){
    if(renderQueued)return;
    renderQueued=true;
    requestAnimationFrame(renderAllNow);
  }

  document.addEventListener('pointerdown',e=>{
    const card=e.target.closest?.('.card[data-id],.hcard[data-id]');
    if(card){
      activeId=card.dataset.id;
      renderAll();
    }
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
      held=false;
      clearTimeout(holdTimer);
      try{counter.setPointerCapture?.(e.pointerId)}catch{}
      holdTimer=setTimeout(()=>{
        counters.set(activeId,(counters.get(activeId)??0)-1);
        held=true;
        renderAll();
      },500);
    };
    counter.onpointerup=e=>{
      if(!activeId)return;
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(holdTimer);
      if(!held)counters.set(activeId,(counters.get(activeId)??0)+1);
      held=false;
      try{counter.releasePointerCapture?.(e.pointerId)}catch{}
      renderAll();
    };
    counter.onpointercancel=()=>{
      clearTimeout(holdTimer);
      held=false;
    };
    counter.onclick=e=>e.preventDefault();
  }

  const apply=document.getElementById('apply');
  if(apply){
    const appApply=apply.onclick;
    apply.onclick=e=>{
      if(typeof appApply==='function')appApply.call(apply,e);
      if(activeId){
        const p=parseInt(document.getElementById('px')?.value,10);
        const t=parseInt(document.getElementById('tx')?.value,10);
        bases.set(activeId,{p:Number.isFinite(p)?p:0,t:Number.isFinite(t)?t:0});
      }
      renderAll();
    };
  }

  for(const root of [document.getElementById('field'),document.getElementById('fullcards')]){
    if(root)new MutationObserver(renderAll).observe(root,{childList:true,subtree:true});
  }

  renderAll();
})();
