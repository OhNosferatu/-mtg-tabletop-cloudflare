(()=>{
  const counters=new Map();
  const bases=new Map();
  let activeId=null;
  let holdTimer=null;
  let held=false;

  const fieldCard=id=>document.querySelector(`#field .card[data-id="${CSS.escape(id)}"]`);
  const fmtCounter=n=>n>0?`+${n}/+${n}`:n<0?`${n}/${n}`:'0/0';

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
    el.hidden=false;
    el.innerHTML=`<span>${fmtCounter(n)}</span>${base?`<small>${base.p}/${base.t}</small>`:''}`;
  }

  function renderBoardCard(id){
    const card=fieldCard(id);
    if(!card)return;
    const hasCounter=counters.has(id);
    const base=bases.get(id);
    if(!hasCounter&&!base)return;
    let badge=card.querySelector('.badge');
    if(!badge){
      badge=document.createElement('div');
      badge.className='badge';
      card.appendChild(badge);
    }
    badge.classList.add('counter-stack');
    badge.style.pointerEvents='none';
    const n=counters.get(id)??0;
    badge.innerHTML=`<span class="counter-line">${fmtCounter(n)}</span>${base?`<span class="base-line">${base.p}/${base.t}</span>`:''}`;
  }

  function renderAll(){
    for(const id of new Set([...counters.keys(),...bases.keys()]))renderBoardCard(id);
    if(document.querySelector('#inspect.on'))renderPreview();
  }

  document.addEventListener('pointerdown',e=>{
    const card=e.target.closest?.('.card[data-id],.hcard[data-id]');
    if(card)activeId=card.dataset.id;
  },true);

  const inspect=document.getElementById('inspect');
  if(inspect)new MutationObserver(renderPreview).observe(inspect,{attributes:true,attributeFilter:['class']});

  const counter=document.getElementById('one');
  if(counter){
    counter.addEventListener('pointerdown',e=>{
      if(!activeId)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      held=false;
      clearTimeout(holdTimer);
      holdTimer=setTimeout(()=>{
        counters.set(activeId,(counters.get(activeId)??0)-1);
        held=true;
        renderAll();
      },500);
    },true);
    counter.addEventListener('pointerup',e=>{
      if(!activeId)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      clearTimeout(holdTimer);
      if(!held)counters.set(activeId,(counters.get(activeId)??0)+1);
      held=false;
      renderAll();
    },true);
    counter.addEventListener('pointercancel',e=>{
      e.stopImmediatePropagation();
      clearTimeout(holdTimer);
      held=false;
    },true);
    counter.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();},true);
  }

  const apply=document.getElementById('apply');
  if(apply){
    apply.addEventListener('click',()=>{
      if(!activeId)return;
      const p=parseInt(document.getElementById('px')?.value,10);
      const t=parseInt(document.getElementById('tx')?.value,10);
      bases.set(activeId,{p:Number.isFinite(p)?p:0,t:Number.isFinite(t)?t:0});
      setTimeout(renderAll,0);
    },true);
  }

  const field=document.getElementById('field');
  if(field)new MutationObserver(renderAll).observe(field,{childList:true,subtree:true});
  renderAll();
})();
