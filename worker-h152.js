import h151 from './worker-h151.js';

const BUILD='H152';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H152_OPPONENT_PUBLIC_CONTROL'))return source;
  const marker=`
/* H152_OPPONENT_PUBLIC_CONTROL */
function h152OppRect(){const o=$('#oppcards');return o?o.getBoundingClientRect():null}
function h152OppSetFieldPosition(c,x,y){
  const r=h152OppRect();if(!r||!c)return;
  h117OppPut(c.id,'field');
  const size=fieldCardSize();
  c.x=Math.max(0,Math.min(100-size.w/r.width*100,(x-r.left-size.w/2)/r.width*100));
  c.y=Math.max(0,Math.min(100-size.h/r.height*100,(y-r.top-size.h/2)/r.height*100));
  h117SnapFieldPosition(c,'opp');h117BringFront(c.id,'opp');
}
function h152OppSnapTarget(el,c){
  const a=el.getBoundingClientRect();let best=null,br=0;
  for(const zone of['cmd','exile','deck','graveyard','tokens']){
    if(zone==='cmd'&&!c.meta?.commander)continue;
    const z=document.querySelector('#h152-opp-piles [data-h152-zone="'+zone+'"]');if(!z)continue;
    const ratio=overlapRatio(a,z.getBoundingClientRect());if(ratio>=.8&&ratio>br){best={zone};br=ratio}
  }
  return best;
}
function h152OppCardEl(c,index){
  const d=cardEl(c,false);d.onclick=null;d.classList.add('h152-opp-card');d.style.left=c.x+'%';d.style.top=c.y+'%';d.style.zIndex=String(20+index);
  let drag=null,moved=false;
  d.onpointerdown=e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();moved=false;h117BringFront(c.id,'opp');d.style.zIndex='10000';const r=h152OppRect(),q=d.getBoundingClientRect();if(!r)return;drag={r,dx:e.clientX-q.left,dy:e.clientY-q.top,sx:e.clientX,sy:e.clientY,pid:e.pointerId};try{d.setPointerCapture?.(e.pointerId)}catch{}};
  d.onpointermove=e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>4)moved=true;if(!moved)return;const x=Math.max(0,Math.min(drag.r.width-d.offsetWidth,e.clientX-drag.r.left-drag.dx)),y=Math.max(0,Math.min(drag.r.height-d.offsetHeight,e.clientY-drag.r.top-drag.dy));c.x=x/drag.r.width*100;c.y=y/drag.r.height*100;d.style.left=c.x+'%';d.style.top=c.y+'%'};
  d.onpointerup=async e=>{if(!drag)return;try{d.releasePointerCapture?.(drag.pid)}catch{}drag=null;if(moved){const snap=h152OppSnapTarget(d,c);if(snap){await h117MoveToZone(c.id,'opp',snap.zone);return}h117SnapFieldPosition(c,'opp');h117BringFront(c.id,'opp');render();return}const now=Date.now(),key='h152_opp_'+c.id,prev=lastTap[key]||0;if(now-prev<330){clearTimeout(lastTap[key+'_timer']);lastTap[key]=0;c.tap=!c.tap;render();return}lastTap[key]=now;lastTap[key+'_timer']=setTimeout(()=>{if(lastTap[key]===now){lastTap[key]=0;requestAnimationFrame(()=>openBoardZoom(c))}},300)};
  d.onpointercancel=()=>{drag=null};d.oncontextmenu=e=>e.preventDefault();return d;
}
function h152OppPile(zone,posClass,label,icon){
  const arr=h117PileArray('opp',zone),count=h117PileCount('opp',zone),id=arr[0],c=id?st.cards[id]:null;
  if(zone==='cmd'){
    const wrap=document.createElement('div');wrap.className='cmds h152-opp-pile h152-cmd '+posClass;wrap.dataset.h152Zone='cmd';
    if(!arr.length){const e=document.createElement('div');e.className='cmd';e.dataset.name='COMMANDER';e.dataset.icon='♛';e.innerHTML='<span class="count">0</span>';wrap.appendChild(e)}
    else arr.slice(0,2).forEach(cid=>{const cc=st.cards[cid];if(!cc)return;const e=document.createElement('div');e.className='cmd';e.dataset.name='COMMANDER';e.dataset.icon='♛';e.dataset.h152Zone='cmd';e.innerHTML=face(cc)+'<span class="count">1</span>';h117ZoneDrag(e,cid,'opp','cmd');wrap.appendChild(e)});
    return wrap;
  }
  const el=document.createElement('div');el.className='zone '+zone+' h152-opp-pile '+posClass;el.dataset.name=label;el.dataset.h152Zone=zone;if(icon)el.dataset.icon=icon;
  if(c){if(zone==='deck'){const img=document.createElement('img');img.src=st.oppPublic.deckFlipped?(frontImage(c)||BACK):BACK;img.draggable=false;el.appendChild(img)}else el.insertAdjacentHTML('beforeend',face(c))}
  else if(zone==='deck'&&count>0){const img=document.createElement('img');img.src=BACK;img.draggable=false;el.appendChild(img)}
  el.insertAdjacentHTML('beforeend','<span class="count">'+count+'</span>');
  if(c)h117ZoneDrag(el,id,'opp',zone,{forceBack:zone==='deck'?!st.oppPublic.deckFlipped:false});
  else if(zone==='deck'&&count>0)el.onclick=()=>h117OpenOpponentDeck();
  return el;
}
function h152EnsureOpponentUI(){
  const opp=$('#opp');if(!opp)return null;
  let piles=$('#h152-opp-piles');if(!piles){piles=document.createElement('div');piles.id='h152-opp-piles';opp.appendChild(piles)}
  let hand=$('#h152-opp-hand');if(!hand){hand=document.createElement('div');hand.id='h152-opp-hand';hand.innerHTML='<span class="h152-hand-icon" aria-hidden="true"></span><b>0</b>';opp.appendChild(hand)}
  return{piles,hand};
}
function h152RenderOpponent(){
  const ui=h152EnsureOpponentUI(),o=$('#oppcards');if(!ui||!o)return;
  o.innerHTML='';st.opp.forEach((id,i)=>{const c=st.cards[id];if(c)o.appendChild(h152OppCardEl(c,i))});
  ui.piles.innerHTML='';
  ui.piles.appendChild(h152OppPile('cmd','h152-cmd','COMMANDER','♛'));
  ui.piles.appendChild(h152OppPile('exile','h152-exile','EXILE','✦'));
  ui.piles.appendChild(h152OppPile('deck','h152-deck','DECK',''));
  ui.piles.appendChild(h152OppPile('graveyard','h152-graveyard','GRAVEYARD','☠'));
  ui.piles.appendChild(h152OppPile('tokens','h152-tokens','TOKENS','◉'));
  ui.hand.querySelector('b').textContent=String(Math.max(0,st.oppPublic?.handCount||0));
  ui.hand.setAttribute('aria-label','Opponent hand: '+Math.max(0,st.oppPublic?.handCount||0)+' cards');
}
const h152BaseRender=render;
render=function(){h152BaseRender();h152RenderOpponent()};
requestAnimationFrame(h152RenderOpponent);
`;
  const end=source.lastIndexOf('})();');
  return end>=0?source.slice(0,end)+marker+source.slice(end):source+marker;
}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h152-opponent-public-control-style'))return out;
  const css=`<style id="h152-opponent-public-control-style">
/* H152: Opponent Side is a public-information control board. */
#opp{position:relative!important}
#opp .title{display:none!important}
#opp>.life-heart[data-life="opp"]{right:8px!important;left:auto!important;top:7px!important}
#oppcards{z-index:8!important}
#h152-opp-piles{position:absolute;inset:0;z-index:12;pointer-events:none}
#h152-opp-piles .h152-opp-pile{position:absolute!important;left:1.4%!important;right:auto!important;margin:0!important;pointer-events:auto!important}
#h152-opp-piles .h152-cmd{top:13.5%!important;display:flex!important;gap:8px!important}
#h152-opp-piles .h152-exile{top:30%!important}
#h152-opp-piles .h152-deck{top:46.5%!important}
#h152-opp-piles .h152-graveyard{top:63%!important}
#h152-opp-piles .h152-tokens{top:79.5%!important}
#h152-opp-hand{position:absolute;right:58px;top:10px;z-index:30;height:32px;min-width:49px;padding:3px 7px;border:1px solid rgba(220,65,65,.68);border-radius:9px;background:#211b17;display:flex;align-items:center;justify-content:center;gap:6px;color:#fff;box-shadow:0 2px 5px #0007;pointer-events:none}
#h152-opp-hand .h152-hand-icon{display:block;width:11px;height:15px;border:1.5px solid #dc4141;border-radius:2px;box-sizing:border-box;box-shadow:3px -3px 0 -1px #211b17,3px -3px 0 0 rgba(220,65,65,.62)}
#h152-opp-hand b{font:1000 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
#opp .zone,#opp .cmd{border-color:rgba(220,65,65,.52)!important}
#opp .h152-opp-card{touch-action:none!important}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h151.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
