(()=>{
  const hand=document.getElementById('hand');
  const button=document.getElementById('closehand');
  if(!hand||!button)return;

  const sync=()=>{
    const closed=hand.classList.contains('closed');
    button.textContent=closed?'Open':'Close';
    button.setAttribute('aria-expanded',closed?'false':'true');
  };

  button.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    hand.classList.toggle('closed');
    sync();
  };

  sync();
})();
