import h132 from './worker-h132.js';

const BUILD='H133';
const DIVIDER_PX=58;

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function replaceBlock(source,startToken,endToken,replacement){
  const start=source.indexOf(startToken);
  const end=source.indexOf(endToken,start);
  if(start<0||end<0)return source;
  return source.slice(0,start)+replacement+source.slice(end);
}

function transformApp(source){
  if(source.includes('H133_FULL_BOARD_DIVIDER_GEOMETRY'))return source;
  let out=source;

  /* H133 keeps each player's Full Board battlefield exactly one normal board
     high. The new match divider is extra scroll content between those two
     boards, not space stolen from either battlefield. */
  out=replaceBlock(out,'function h117HalfRect(owner){','function h117FieldIds',`/* H133_FULL_BOARD_DIVIDER_GEOMETRY */
function h117HalfRect(owner){
  const content=$('#h105fullcontent');
  if(!content)return null;
  const r=content.getBoundingClientRect();
  const css=getComputedStyle(content);
  const divider=parseFloat(css.getPropertyValue('--h133-divider-h'))||${DIVIDER_PX};
  const boardH=Math.max(1,(r.height-divider)/2);
  const top=owner==='opp'?r.top:r.top+boardH+divider;
  return{left:r.left,right:r.right,width:r.width,top,bottom:top+boardH,height:boardH};
}
`);

  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+'\n/* H133_FULL_BOARD_DIVIDER_GEOMETRY_END */\n'+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h133-fullboard-match-divider'))return out;

  const css=`<style id="h133-fullboard-match-divider">
:root{--h133-divider-h:${DIVIDER_PX}px}

/* The scroll surface is now: opponent board + divider + your board. Each board
   remains exactly one ordinary battlefield high. */
#h105fullcontent{
  --h133-divider-h:${DIVIDER_PX}px;
  height:calc(200% + var(--h133-divider-h))!important;
  min-height:calc(200% + var(--h133-divider-h))!important;
}
#h105fullcontent #fullcards{
  top:0!important;
  bottom:auto!important;
  height:calc(100% - var(--h133-divider-h))!important;
  min-height:0!important;
}
/* Stored card percentages still live on an exact 200%-high two-board layer.
   Only the lower player's rendered cards are translated past the new divider. */
#fullcards .full-you-card{translate:0 var(--h133-divider-h)!important}

/* Pile percentages also remain on the established two-board layer. */
#h116-piles-opp,#h116-piles-you{
  top:0!important;
  bottom:auto!important;
  height:calc(100% - var(--h133-divider-h))!important;
  min-height:0!important;
}
#h116-piles-you{translate:0 var(--h133-divider-h)!important}

/* Hand-count chips keep the same location inside each unchanged battlefield. */
.h117-hand-opp{top:8px!important}
.h117-hand-you{top:calc(50% + ${DIVIDER_PX/2 + 8}px)!important}

/* Life totals move into the match strip. Keep the original Full Board life
   buttons in the DOM as the game-state controls, but hide their old corners. */
#h105fullcontent>.life-heart{display:none!important}

/* Replace the old single divider with a true two-line match strip. Its top is
   exactly one normal battlefield below the top of the scroll canvas. */
#h105divider{
  left:1.2%!important;
  right:1.2%!important;
  top:calc(50% - ${DIVIDER_PX/2}px)!important;
  width:auto!important;
  height:var(--h133-divider-h)!important;
  box-sizing:border-box!important;
  background:rgba(20,16,13,.94)!important;
  border-top:2px solid rgba(201,166,107,.72)!important;
  border-bottom:2px solid rgba(201,166,107,.72)!important;
  box-shadow:inset 0 1px rgba(255,255,255,.035),inset 0 -1px rgba(255,255,255,.025),0 0 10px rgba(0,0,0,.26)!important;
  z-index:95!important;
  pointer-events:auto!important;
  touch-action:pan-y!important;
  display:grid!important;
  grid-template-columns:72px minmax(0,1fr) 72px!important;
  align-items:center!important;
  gap:5px!important;
  padding:5px 7px!important;
}
.h133-life.life-heart{
  position:relative!important;
  inset:auto!important;
  width:100%!important;
  height:42px!important;
  min-width:0!important;
  padding:3px 4px 3px 25px!important;
  border:1px solid #6f5a42!important;
  border-radius:9px!important;
  background:#211b17!important;
  color:#fff!important;
  display:grid!important;
  grid-template-rows:auto 1fr!important;
  place-items:center!important;
  box-shadow:0 2px 5px #0007!important;
  touch-action:manipulation!important;
}
.h133-life.life-heart::before{
  content:'♥'!important;
  position:absolute!important;
  left:6px!important;
  top:50%!important;
  width:auto!important;
  height:auto!important;
  inset-inline-end:auto!important;
  transform:translateY(-50%)!important;
  color:#cf3434!important;
  font-size:24px!important;
  line-height:1!important;
  filter:drop-shadow(0 1px 1px #0008)!important;
}
.h133-life.life-heart small{
  font:800 6px/1 ui-monospace,SFMono-Regular,Menlo,monospace!important;
  letter-spacing:.08em!important;
  color:#c9b99e!important;
}
.h133-life.life-heart span{
  position:relative!important;
  z-index:2!important;
  font:1000 15px/1 ui-monospace,SFMono-Regular,Menlo,monospace!important;
  color:#fff!important;
  text-shadow:0 1px 2px #000!important;
}
#h105divider[data-turn="opp"] .h133-life[data-side="opp"],
#h105divider[data-turn="you"] .h133-life[data-side="you"]{
  border-color:#d7b46a!important;
  box-shadow:0 0 0 1px rgba(215,180,106,.24),0 2px 6px #0008!important;
}
.h133-turn-core{
  min-width:0!important;
  height:44px!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 76px!important;
  gap:5px!important;
  align-items:stretch!important;
}
#h133-turn-switch{
  min-width:0!important;
  border:1px solid #786246!important;
  border-radius:9px!important;
  background:#30271f!important;
  color:#f5ead8!important;
  padding:3px 7px!important;
  display:grid!important;
  grid-template-columns:1fr auto!important;
  align-items:center!important;
  gap:5px!important;
  touch-action:manipulation!important;
}
#h133-turn-switch .h133-turn-label{
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
  font:900 7px/1.05 ui-monospace,SFMono-Regular,Menlo,monospace!important;
  letter-spacing:.04em!important;
}
#h133-turn-switch .h133-swap{
  font:1000 17px/1 system-ui!important;
  color:#d7b46a!important;
}
.h133-match-stats{
  min-width:0!important;
  display:grid!important;
  grid-template-rows:1fr 1fr!important;
  border:1px solid #66513e!important;
  border-radius:9px!important;
  overflow:hidden!important;
  background:#171310!important;
}
.h133-match-stats>span{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:3px!important;
  min-width:0!important;
  color:#cdbd9f!important;
  font:800 6px/1 ui-monospace,SFMono-Regular,Menlo,monospace!important;
}
.h133-match-stats>span+span{border-top:1px solid #4f4031!important}
.h133-match-stats b,#h133-turn-timer{
  color:#fff!important;
  font:1000 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace!important;
}

/* Use real land-zone elements so their vertical dimensions remain an exact 27%
   of one battlefield even though the overall scroll surface is now taller. */
#h105fullcontent::before,#h105fullcontent::after{display:none!important}
.h133-land-zone{
  position:absolute!important;
  left:16%!important;
  right:5%!important;
  width:auto!important;
  z-index:3!important;
  border:1.5px solid rgba(24,55,36,.78)!important;
  border-radius:12px!important;
  background:rgba(24,55,36,.12)!important;
  box-shadow:inset 0 0 0 1px rgba(13,38,25,.16)!important;
  pointer-events:none!important;
  box-sizing:border-box!important;
}
@media(max-width:390px){
  #h105divider{grid-template-columns:67px minmax(0,1fr) 67px!important;padding-left:5px!important;padding-right:5px!important;gap:4px!important}
  .h133-life.life-heart{padding-left:23px!important}
  .h133-life.life-heart::before{left:5px!important;font-size:22px!important}
  .h133-turn-core{grid-template-columns:minmax(0,1fr) 70px!important;gap:4px!important}
  .h133-land-zone{right:4%!important}
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h133-fullboard-match-divider-script">window.addEventListener('DOMContentLoaded',()=>{
    const install=()=>{
      const content=document.getElementById('h105fullcontent');
      const divider=document.getElementById('h105divider');
      if(!content||!divider){requestAnimationFrame(install);return}
      if(divider.dataset.h133Ready)return;
      divider.dataset.h133Ready='1';
      divider.dataset.turn='you';

      divider.innerHTML=''+
        '<button class="life-heart h133-life" data-life="opp" data-side="opp" aria-label="Opponent life total"><small>OPP</small><span>40</span></button>'+
        '<div class="h133-turn-core">'+
          '<button id="h133-turn-switch" aria-label="Switch active turn"><span class="h133-turn-label">YOUR TURN</span><span class="h133-swap">⇄</span></button>'+
          '<div class="h133-match-stats"><span>TURN <b id="h133-turn-count">1</b></span><span id="h133-turn-timer">00:00</span></div>'+
        '</div>'+
        '<button class="life-heart h133-life" data-life="you" data-side="you" aria-label="Your life total"><small>YOU</small><span>40</span></button>';

      /* New life controls proxy the original game-owned buttons so the existing
         single-tap lose / double-tap gain mechanics remain the source of truth. */
      for(const btn of divider.querySelectorAll('.h133-life[data-life]')){
        btn.addEventListener('click',e=>{
          e.preventDefault();e.stopPropagation();
          const side=btn.dataset.life;
          const original=[...content.children].find(el=>el.classList?.contains('life-heart')&&el.dataset.life===side);
          original?.click();
        });
        btn.addEventListener('contextmenu',e=>e.preventDefault());
      }

      let active='you',turn=1,started=Date.now();
      const label=divider.querySelector('.h133-turn-label');
      const count=divider.querySelector('#h133-turn-count');
      const timer=divider.querySelector('#h133-turn-timer');
      const turnButton=divider.querySelector('#h133-turn-switch');
      const formatTime=ms=>{
        const total=Math.max(0,Math.floor(ms/1000)),m=Math.floor(total/60),s=total%60;
        return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
      };
      const renderTurn=()=>{
        divider.dataset.turn=active;
        if(label)label.textContent=active==='you'?'YOUR TURN':'OPP TURN';
        if(count)count.textContent=String(turn);
        if(timer)timer.textContent=formatTime(Date.now()-started);
      };
      turnButton?.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        active=active==='you'?'opp':'you';turn+=1;started=Date.now();renderTurn();
      });
      renderTurn();setInterval(renderTurn,250);

      const oppLand=document.createElement('div');oppLand.className='h133-land-zone h133-land-opp';oppLand.setAttribute('aria-hidden','true');
      const youLand=document.createElement('div');youLand.className='h133-land-zone h133-land-you';youLand.setAttribute('aria-hidden','true');
      content.appendChild(oppLand);content.appendChild(youLand);
      const layout=()=>{
        const dividerH=parseFloat(getComputedStyle(content).getPropertyValue('--h133-divider-h'))||${DIVIDER_PX};
        const boardH=Math.max(1,(content.clientHeight-dividerH)/2);
        const landH=boardH*.27;
        oppLand.style.top=(boardH*.05)+'px';oppLand.style.height=landH+'px';
        youLand.style.top=(boardH+dividerH+boardH*.68)+'px';youLand.style.height=landH+'px';
      };
      layout();
      new ResizeObserver(layout).observe(content);
      window.addEventListener('orientationchange',()=>setTimeout(layout,80),{passive:true});

      /* Seed the new life text from the already-rendered originals. */
      for(const side of['opp','you']){
        const original=[...content.children].find(el=>el.classList?.contains('life-heart')&&el.dataset.life===side);
        const mirror=divider.querySelector('.h133-life[data-life="'+side+'"] span');
        if(original&&mirror)mirror.textContent=original.querySelector('span')?.textContent||'40';
      }
    };
    install();
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h132.fetch(request,env,ctx);
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
