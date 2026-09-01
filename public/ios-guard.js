(()=>{
  const isImportTarget=el=>!!el?.closest?.('#imp');

  document.addEventListener('dblclick',e=>{
    if(!isImportTarget(e.target))e.preventDefault();
  },{capture:true});

  document.addEventListener('gesturestart',e=>{
    if(!isImportTarget(e.target))e.preventDefault();
  },{capture:true,passive:false});

  document.addEventListener('gesturechange',e=>{
    if(!isImportTarget(e.target))e.preventDefault();
  },{capture:true,passive:false});

  document.addEventListener('gestureend',e=>{
    if(!isImportTarget(e.target))e.preventDefault();
  },{capture:true,passive:false});

  const close=()=>document.getElementById('inspect')?.classList.remove('on');
  document.getElementById('closeinspect')?.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    close();
  });
})();
