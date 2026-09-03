import h165 from './worker-h165.js';

const BUILD='H166';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h166-native-mana-number'))return out;

  const css=`<style id="h166-native-mana-number-style">
/* H166: match the card-inspector translucent backdrop and use the device's
   native numeric keyboard rather than the in-game keypad. */
#h164-token-editor{background:#000c!important}
#h164-token-editor .h164-editor-box{
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
}
#h164-keypad-wrap{display:none!important}
#h166-native-number{
  display:none;
  width:min(92%,360px);
  height:42px;
  margin:8px auto 0;
  padding:0 12px;
  border:1px solid #594838;
  border-radius:8px;
  background:#14110fee;
  color:#fff;
  text-align:center;
  font:1000 16px/1 ui-monospace,Menlo,monospace;
  outline:none;
  -webkit-appearance:none;
  appearance:none;
}
#h166-native-number.on{display:block}
#h166-native-number:focus{border-color:#d3ad70;box-shadow:0 0 0 2px rgba(211,173,112,.18)}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h166-native-mana-number">window.addEventListener('DOMContentLoaded',()=>{
    const editor=document.getElementById('h164-token-editor');
    const setBtn=document.getElementById('h164-keypad-open');
    const controls=document.getElementById('h164-editor-controls');
    const hiddenPad=document.getElementById('h164-keypad');
    const hiddenClose=document.getElementById('h164-keypad-close');
    if(!editor||!setBtn||!controls||!hiddenPad||!hiddenClose)return;

    let input=document.getElementById('h166-native-number');
    if(!input){
      input=document.createElement('input');
      input.id='h166-native-number';
      input.type='text';
      input.inputMode='numeric';
      input.pattern='[0-9]*';
      input.maxLength=4;
      input.autocomplete='off';
      input.enterKeyHint='done';
      input.setAttribute('aria-label','Mana amount');
      controls.insertAdjacentElement('afterend',input);
    }

    const sanitize=()=>{input.value=(input.value||'').replace(/\\D/g,'').slice(0,4)};
    const currentValue=()=>{
      const value=editor.querySelector('#h164-editor-token .h164-value');
      return value?value.textContent.trim():'0';
    };
    const commit=()=>{
      if(!input.classList.contains('on'))return;
      sanitize();
      const value=input.value===''?'0':input.value;
      for(const ch of value){hiddenPad.querySelector('[data-k="'+ch+'"]')?.click()}
      hiddenClose.click();
      input.classList.remove('on');
    };

    setBtn.addEventListener('click',()=>{
      input.value=currentValue();
      input.classList.add('on');
      requestAnimationFrame(()=>{try{input.focus({preventScroll:true})}catch{input.focus()}input.select?.()});
    });
    input.addEventListener('input',sanitize);
    input.addEventListener('blur',()=>setTimeout(commit,0));
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur()}if(e.key==='Escape'){input.classList.remove('on');input.blur()}});

    const closeEditor=document.getElementById('h164-editor-close');
    closeEditor?.addEventListener('click',()=>input.classList.remove('on'));
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h165.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
