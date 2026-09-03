import h172 from './worker-h172.js';

const BUILD='H173';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h173-opponent-inventory-tokens'))return out;

  /* Inventory tokens now have an owner. Existing saved tokens default to you.
     Render each token only on its owner's dedicated board and matching Full
     Board half. */
  out=out.replace(
`const ensureLayers=()=>{
      const you=document.getElementById('you');if(you&&!document.getElementById('h164-mana-you')){const l=document.createElement('div');l.id='h164-mana-you';l.className='h164-mana-layer';you.appendChild(l)}
      const content=document.getElementById('h105fullcontent');if(content&&!document.getElementById('h164-mana-full')){const l=document.createElement('div');l.id='h164-mana-full';l.className='h164-mana-layer';content.appendChild(l)}
    };`,
`const ensureLayers=()=>{
      const you=document.getElementById('you');if(you&&!document.getElementById('h164-mana-you')){const l=document.createElement('div');l.id='h164-mana-you';l.className='h164-mana-layer';you.appendChild(l)}
      const board=document.getElementById('board');if(board&&!document.getElementById('h173-mana-opp')){const l=document.createElement('div');l.id='h173-mana-opp';l.className='h164-mana-layer h173-mana-opp-layer';board.appendChild(l)}
      const content=document.getElementById('h105fullcontent');if(content&&!document.getElementById('h164-mana-full')){const l=document.createElement('div');l.id='h164-mana-full';l.className='h164-mana-layer';content.appendChild(l)}
      if(content&&!document.getElementById('h173-mana-full-opp')){const l=document.createElement('div');l.id='h173-mana-full-opp';l.className='h164-mana-layer';content.appendChild(l)}
    };`
  );

  out=out.replace(
`const placeEl=(d,t,mode)=>{
      const D=32;
      if(mode==='you'){const host=document.getElementById('you'),field=document.getElementById('field');if(!host||!field)return;const hr=host.getBoundingClientRect(),fr=field.getBoundingClientRect();d.style.left=(fr.left-hr.left+t.x*Math.max(0,fr.width-D))+'px';d.style.top=(fr.top-hr.top+t.y*Math.max(0,fr.height-D))+'px';return}
      const content=document.getElementById('h105fullcontent'),hr=halfRect();if(!content||!hr)return;const cr=content.getBoundingClientRect();d.style.left=(hr.left-cr.left+t.x*Math.max(0,hr.width-D))+'px';d.style.top=(hr.top-cr.top+t.y*Math.max(0,hr.height-D))+'px';
    };`,
`const h173OppRect=()=>{const board=document.getElementById('board');const r=board?.getBoundingClientRect();return r&&r.width?r:null};
    const h173FullRect=owner=>{const content=document.getElementById('h105fullcontent');const r=content?.getBoundingClientRect();if(!r||!r.width||!r.height)return null;const divider=58,h=(r.height-divider)/2;const top=owner==='opp'?r.top:r.top+h+divider;return{left:r.left,top,width:r.width,height:h,right:r.right,bottom:top+h}};
    const placeEl=(d,t,mode)=>{
      const D=32;
      if(mode==='you'){const host=document.getElementById('you'),field=document.getElementById('field');if(!host||!field)return;const hr=host.getBoundingClientRect(),fr=field.getBoundingClientRect();d.style.left=(fr.left-hr.left+t.x*Math.max(0,fr.width-D))+'px';d.style.top=(fr.top-hr.top+t.y*Math.max(0,fr.height-D))+'px';return}
      if(mode==='opp'){const board=document.getElementById('board'),r=h173OppRect();if(!board||!r)return;d.style.left=(t.x*Math.max(0,r.width-D))+'px';d.style.top=(t.y*Math.max(0,r.height-D))+'px';return}
      const content=document.getElementById('h105fullcontent'),owner=mode==='fullopp'?'opp':'you',hr=h173FullRect(owner);if(!content||!hr)return;const cr=content.getBoundingClientRect();d.style.left=(hr.left-cr.left+t.x*Math.max(0,hr.width-D))+'px';d.style.top=(hr.top-cr.top+t.y*Math.max(0,hr.height-D))+'px';
    };`
  );

  out=out.replace(
`const render=()=>{
      ensureLayers();
      for(const [id,mode] of [['h164-mana-you','you'],['h164-mana-full','full']]){const l=document.getElementById(id);if(!l)continue;l.innerHTML='';tokens.forEach(t=>{const d=makeToken(t,mode);placeEl(d,t,mode);l.appendChild(d)})}
    };`,
`const render=()=>{
      ensureLayers();tokens.forEach(t=>{if(!t.owner)t.owner='you'});
      for(const [id,mode,owner] of [['h164-mana-you','you','you'],['h173-mana-opp','opp','opp'],['h164-mana-full','full','you'],['h173-mana-full-opp','fullopp','opp']]){const l=document.getElementById(id);if(!l)continue;l.innerHTML='';tokens.filter(t=>(t.owner||'you')===owner).forEach(t=>{const d=makeToken(t,mode);placeEl(d,t,mode);l.appendChild(d)})}
    };`
  );

  /* Full Board inventory drops can target either exact half; dedicated Opponent
     drops target the opponent board. */
  out=out.replace(
`const h171DropRect=()=>{
      if(document.querySelector('[data-v="full"]')?.classList.contains('on'))return halfRect();
      if(document.querySelector('[data-v="you"]')?.classList.contains('on'))return document.getElementById('field')?.getBoundingClientRect()||null;
      return null;
    };`,
`const h171DropTarget=(clientX,clientY)=>{
      if(document.querySelector('[data-v="full"]')?.classList.contains('on')){
        const you=h173FullRect('you'),opp=h173FullRect('opp');
        if(opp&&clientX>=opp.left&&clientX<=opp.right&&clientY>=opp.top&&clientY<=opp.bottom)return{owner:'opp',rect:opp};
        if(you&&clientX>=you.left&&clientX<=you.right&&clientY>=you.top&&clientY<=you.bottom)return{owner:'you',rect:you};
        return null;
      }
      if(document.querySelector('[data-v="opp"]')?.classList.contains('on')){const r=h173OppRect();return r?{owner:'opp',rect:r}:null}
      if(document.querySelector('[data-v="you"]')?.classList.contains('on')){const r=document.getElementById('field')?.getBoundingClientRect()||null;return r?{owner:'you',rect:r}:null}
      return null;
    };`
  );
  out=out.replace(
`const h171AddAt=(type,clientX,clientY)=>{
      const r=h171DropRect();if(!r||!r.width||!r.height)return false;
      if(clientX<r.left||clientX>r.right||clientY<r.top||clientY>r.bottom)return false;
      const D=32;
      const x=Math.max(0,Math.min(1,(clientX-r.left-D/2)/Math.max(1,r.width-D)));
      const y=Math.max(0,Math.min(1,(clientY-r.top-D/2)/Math.max(1,r.height-D)));
      tokens.push({id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),type,value:0,x,y});
      save();render();return true;
    };`,
`const h171AddAt=(type,clientX,clientY)=>{
      const target=h171DropTarget(clientX,clientY),r=target?.rect;if(!r||!r.width||!r.height)return false;
      const D=32;
      const x=Math.max(0,Math.min(1,(clientX-r.left-D/2)/Math.max(1,r.width-D)));
      const y=Math.max(0,Math.min(1,(clientY-r.top-D/2)/Math.max(1,r.height-D)));
      tokens.push({id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),type,value:0,x,y,owner:target.owner});
      save();render();return true;
    };`
  );

  /* Moving a placed token stays in the owner's shared coordinate plane. */
  out=out.replace(
`if(mode==='you'){const r=document.getElementById('field')?.getBoundingClientRect();if(!r||!r.width)return;t.x=Math.max(0,Math.min(1,(e.clientX-r.left-D/2)/Math.max(1,r.width-D)));t.y=Math.max(0,Math.min(1,(e.clientY-r.top-D/2)/Math.max(1,r.height-D)));placeEl(el,t,'you')}
        else{const r=halfRect();if(!r||!r.width)return;t.x=Math.max(0,Math.min(1,(e.clientX-r.left-D/2)/Math.max(1,r.width-D)));t.y=Math.max(0,Math.min(1,(e.clientY-r.top-D/2)/Math.max(1,r.height-D)));placeEl(el,t,'full')}`,
`if(mode==='you'){const r=document.getElementById('field')?.getBoundingClientRect();if(!r||!r.width)return;t.x=Math.max(0,Math.min(1,(e.clientX-r.left-D/2)/Math.max(1,r.width-D)));t.y=Math.max(0,Math.min(1,(e.clientY-r.top-D/2)/Math.max(1,r.height-D)));placeEl(el,t,'you')}
        else if(mode==='opp'){const r=h173OppRect();if(!r||!r.width)return;t.x=Math.max(0,Math.min(1,(e.clientX-r.left-D/2)/Math.max(1,r.width-D)));t.y=Math.max(0,Math.min(1,(e.clientY-r.top-D/2)/Math.max(1,r.height-D)));placeEl(el,t,'opp')}
        else{const owner=mode==='fullopp'?'opp':'you',r=h173FullRect(owner);if(!r||!r.width)return;t.x=Math.max(0,Math.min(1,(e.clientX-r.left-D/2)/Math.max(1,r.width-D)));t.y=Math.max(0,Math.min(1,(e.clientY-r.top-D/2)/Math.max(1,r.height-D)));placeEl(el,t,mode)}`
  );

  const css=`<style id="h173-opponent-inventory-tokens-style">
/* Dedicated opponent token layer shares the same normal-board plane as the
   H157 opponent overlay. It is visible only on that screen. */
#h173-mana-opp{display:none!important;z-index:28!important}
body.h157-opp-mode #h173-mana-opp{display:block!important}
#h173-mana-opp .h164-mana-token,#h173-mana-full-opp .h164-mana-token{pointer-events:auto!important}
#h173-mana-full-opp{z-index:19!important;pointer-events:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h173-opponent-inventory-tokens">window.addEventListener('DOMContentLoaded',()=>{
    const sync=()=>requestAnimationFrame(()=>window.MTG_H168_manaLifecycle?.render?.());
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',sync));
    window.addEventListener('resize',sync,{passive:true});window.addEventListener('pageshow',sync);sync();
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h172.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
